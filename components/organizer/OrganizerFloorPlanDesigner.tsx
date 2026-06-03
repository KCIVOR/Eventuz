"use client";

import { saveFloorPlanLayout } from "@/app/organizer/events/actions";
import {
  FLOOR_PLAN_CANVAS_HEIGHT,
  FLOOR_PLAN_CANVAS_WIDTH,
  FLOOR_PLAN_GRID_SIZE,
  floorPlanSeatCount,
  isFloorPlanSeatElement,
  type FloorPlanElement,
  type FloorPlanElementType,
  type FloorPlanLayout,
  type FloorPlanTicketType,
} from "@/lib/organizer/floorPlan";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  eventId: string;
  ticketTypes: FloorPlanTicketType[];
  initialLayout: FloorPlanLayout;
  canvasWidth?: number;
  canvasHeight?: number;
  gridSize?: number;
};

type DragState = {
  id: string;
  mode: "move" | "resize" | "wall-start" | "wall-end";
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
  startX2?: number;
  startY2?: number;
  startWidth: number;
  startHeight: number;
};

type PaletteItem = {
  type: FloorPlanElementType;
  label: string;
  group: "Structure" | "Seats" | "Other" | "Text";
  width: number;
  height: number;
  color: string;
};

const PALETTE: PaletteItem[] = [
  { type: "wall", label: "Wall", group: "Structure", width: 160, height: 4, color: "#1C1714" },
  { type: "window", label: "Window", group: "Structure", width: 120, height: 20, color: "#8FB7C9" },
  { type: "door", label: "Door", group: "Structure", width: 80, height: 40, color: "#7A6E68" },
  { type: "exit", label: "Exit", group: "Structure", width: 100, height: 40, color: "#7F9F7A" },
  { type: "entrance", label: "Entrance", group: "Structure", width: 120, height: 40, color: "#C9A96E" },
  { type: "stage", label: "Stage", group: "Structure", width: 220, height: 100, color: "#B66A45" },
  { type: "screen", label: "Screen", group: "Structure", width: 120, height: 30, color: "#A35D3D" },
  { type: "barrier", label: "Barrier", group: "Structure", width: 140, height: 20, color: "#5E5550" },
  { type: "circle_table", label: "Circle table", group: "Seats", width: 120, height: 120, color: "#8FB7C9" },
  { type: "square_table", label: "Square table", group: "Seats", width: 120, height: 120, color: "#E8C4C4" },
  { type: "rectangle_table", label: "Rectangle table", group: "Seats", width: 180, height: 100, color: "#D8B35A" },
  { type: "rowed_seats", label: "Rowed seats", group: "Seats", width: 180, height: 120, color: "#A8B99A" },
  { type: "food_table", label: "Food table", group: "Other", width: 160, height: 70, color: "#B88967" },
  { type: "bar", label: "Bar", group: "Other", width: 160, height: 70, color: "#8B5E3C" },
  { type: "stall", label: "Stall", group: "Other", width: 120, height: 80, color: "#9B7AA8" },
  { type: "text", label: "Text label", group: "Text", width: 160, height: 50, color: "#1C1714" },
];

const DEFAULT_LABELS: Record<FloorPlanElementType, string> = Object.fromEntries(
  PALETTE.map((item) => [item.type, item.label])
) as Record<FloorPlanElementType, string>;

const GROUPS: PaletteItem["group"][] = ["Structure", "Seats", "Other", "Text"];
const SEAT_TABLE_TYPES = new Set<FloorPlanElementType>([
  "circle_table",
  "square_table",
  "rectangle_table",
]);
const TICKET_COLORS = ["#8FB7C9", "#E8C4C4", "#D8B35A", "#A8B99A", "#B88967", "#9B7AA8"];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;
const ROWED_SEAT_WIDTH = 16;
const ROWED_SEAT_HEIGHT = 18;
const ROWED_SEAT_GAP_X = 12;
const ROWED_SEAT_GAP_Y = 3;
const ROWED_SEAT_PADDING = 2;
const CANVAS_SIZE_PRESETS = [
  { label: "Standard", width: 1200, height: 800 },
  { label: "Large", width: 1800, height: 1200 },
  { label: "Extra large", width: 2400, height: 1600 },
];

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `fp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function snap(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isTableElement(type: FloorPlanElementType) {
  return SEAT_TABLE_TYPES.has(type);
}

function wallEnd(element: FloorPlanElement) {
  return {
    x2: element.x2 ?? element.x + element.width,
    y2: element.y2 ?? element.y,
  };
}

function wallMetrics(element: FloorPlanElement) {
  const { x2, y2 } = wallEnd(element);
  const dx = x2 - element.x;
  const dy = y2 - element.y;
  return {
    x2,
    y2,
    length: Math.max(1, Math.hypot(dx, dy)),
    angle: Math.atan2(dy, dx),
  };
}

function rowedSeatFootprint(rows: number, columns: number) {
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

function fittedRowedSize(rows: number, columns: number, gridSize: number) {
  const footprint = rowedSeatFootprint(rows, columns);
  return {
    width: Math.max(gridSize, snap(footprint.width, gridSize)),
    height: Math.max(gridSize, snap(footprint.height, gridSize)),
  };
}

function normalizeInitialLayout(layout: FloorPlanLayout): FloorPlanElement[] {
  return Array.isArray(layout.elements) ? layout.elements : [];
}

function SaveButton({
  disabled,
  label,
  mode,
}: {
  disabled: boolean;
  label: string;
  mode: "draft" | "validated";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="save_mode"
      value={mode}
      disabled={disabled || pending}
      className="rounded-sm bg-[#1C1714] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#342720] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

function elementClasses(element: FloorPlanElement, selected: boolean) {
  const base =
    "absolute select-none border text-center shadow-sm transition-shadow";
  const selectedClass = selected
    ? " border-[#1C1714] ring-2 ring-[#C9A96E]/50"
    : " border-[#1C1714]/20 hover:border-[#C9A96E]";
  const radius =
    element.type === "circle_table"
      ? " rounded-full"
      : element.type === "text"
        ? " rounded-none border-transparent bg-transparent shadow-none"
        : " rounded-sm";
  return `${base}${selectedClass}${radius}`;
}

function SeatMarkers({ element }: { element: FloorPlanElement }) {
  const count = Math.min(floorPlanSeatCount(element), 24);
  if (count <= 0 || element.type === "rowed_seats") return null;
  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / count) * Math.PI * 2;
        const angleDeg = (angle * 180) / Math.PI;
        const rx = element.width / 2 + 10;
        const ry = element.height / 2 + 10;
        return (
          <span
            key={index}
            className="absolute h-4 w-4 border border-[#1C1714]/25 bg-[#FDFAF4] shadow-[0_1px_2px_rgba(28,23,20,0.12)]"
            style={{
              left: element.width / 2 + Math.cos(angle) * rx - 8,
              top: element.height / 2 + Math.sin(angle) * ry - 8,
              transform: `rotate(${angleDeg}deg)`,
            }}
          />
        );
      })}
    </>
  );
}

function RowedSeatPreview({ element }: { element: FloorPlanElement }) {
  if (element.type !== "rowed_seats") return null;
  const rows = Math.min(element.rows ?? 1, 40);
  const columns = Math.min(element.columns ?? 1, 40);
  const footprint = rowedSeatFootprint(rows, columns);
  const scale = Math.min(
    1,
    (element.width - ROWED_SEAT_PADDING * 2) / footprint.width,
    (element.height - ROWED_SEAT_PADDING * 2) / footprint.height
  );
  return (
    <div
      className="absolute left-1/2 top-1/2 grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, ${ROWED_SEAT_WIDTH}px)`,
        gap: `${ROWED_SEAT_GAP_Y}px ${ROWED_SEAT_GAP_X}px`,
        padding: ROWED_SEAT_PADDING,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      {Array.from({ length: rows * columns }).map((_, index) => (
        <span
          key={index}
          className="rounded-[3px] border border-[#1C1714]/70 bg-[#FDFAF4]"
          style={{ width: ROWED_SEAT_WIDTH, height: ROWED_SEAT_HEIGHT }}
        />
      ))}
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(201, 169, 110, 0.24)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  const lineHeight = 16;
  const startY = -((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, 0, startY + index * lineHeight);
  });
}

function wallDash(style: FloorPlanElement["wallStyle"], lineWidth: number) {
  if (style === "dashed") return [lineWidth * 4, lineWidth * 2];
  if (style === "dotted") return [lineWidth, lineWidth * 2.2];
  return [];
}

function drawTableSeatMarkers(ctx: CanvasRenderingContext2D, element: FloorPlanElement) {
  const count = Math.min(floorPlanSeatCount(element), 24);
  if (count <= 0) return;
  const rx = element.width / 2 + 10;
  const ry = element.height / 2 + 10;
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "#FDFAF4";
    ctx.strokeStyle = "rgba(28, 23, 20, 0.35)";
    ctx.lineWidth = 1;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }
}

function drawRowedSeats(ctx: CanvasRenderingContext2D, element: FloorPlanElement) {
  const rows = Math.min(element.rows ?? 1, 40);
  const columns = Math.min(element.columns ?? 1, 40);
  const footprint = rowedSeatFootprint(rows, columns);
  const scale = Math.min(
    1,
    (element.width - ROWED_SEAT_PADDING * 2) / footprint.width,
    (element.height - ROWED_SEAT_PADDING * 2) / footprint.height
  );
  const startX = -footprint.width / 2 + ROWED_SEAT_PADDING;
  const startY = -footprint.height / 2 + ROWED_SEAT_PADDING;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = "#FDFAF4";
  ctx.strokeStyle = "rgba(28, 23, 20, 0.75)";
  ctx.lineWidth = 1;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = startX + column * (ROWED_SEAT_WIDTH + ROWED_SEAT_GAP_X);
      const y = startY + row * (ROWED_SEAT_HEIGHT + ROWED_SEAT_GAP_Y);
      ctx.fillRect(x, y, ROWED_SEAT_WIDTH, ROWED_SEAT_HEIGHT);
      ctx.strokeRect(x, y, ROWED_SEAT_WIDTH, ROWED_SEAT_HEIGHT);
    }
  }
  ctx.restore();
}

function drawElement(ctx: CanvasRenderingContext2D, element: FloorPlanElement) {
  if (element.type === "wall") {
    const { x2, y2 } = wallEnd(element);
    const lineWidth = Math.max(3, Math.min(8, element.height || 4));
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.setLineDash(wallDash(element.wallStyle, lineWidth));
    ctx.beginPath();
    ctx.moveTo(element.x, element.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
  ctx.rotate((element.rotation * Math.PI) / 180);

  if (element.type !== "text") {
    ctx.fillStyle = element.color;
    ctx.strokeStyle = "rgba(28, 23, 20, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (element.type === "circle_table") {
      ctx.ellipse(0, 0, element.width / 2, element.height / 2, 0, 0, Math.PI * 2);
    } else {
      ctx.rect(-element.width / 2, -element.height / 2, element.width, element.height);
    }
    ctx.fill();
    ctx.stroke();
  }

  if (isTableElement(element.type)) {
    drawTableSeatMarkers(ctx, element);
  }
  if (element.type === "rowed_seats") {
    drawRowedSeats(ctx, element);
  }

  ctx.fillStyle = element.type === "text" ? element.color : "#1C1714";
  ctx.font = "700 12px Arial, sans-serif";
  if (element.type === "rowed_seats") {
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "700 10px Arial, sans-serif";
    ctx.fillText(element.label, -element.width / 2 + 4, -element.height / 2 - 8);
  } else {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawWrappedText(ctx, element.label, Math.max(40, element.width - 16));
  }
  ctx.restore();
}

export function OrganizerFloorPlanDesigner({
  eventId,
  ticketTypes,
  initialLayout,
  canvasWidth: initialCanvasWidth = FLOOR_PLAN_CANVAS_WIDTH,
  canvasHeight: initialCanvasHeight = FLOOR_PLAN_CANVAS_HEIGHT,
  gridSize = FLOOR_PLAN_GRID_SIZE,
}: Props) {
  const [elements, setElements] = useState<FloorPlanElement[]>(() => normalizeInitialLayout(initialLayout));
  const [selectedId, setSelectedId] = useState<string | null>(elements[0]?.id ?? null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(initialCanvasWidth);
  const [canvasHeight, setCanvasHeight] = useState(initialCanvasHeight);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selected = elements.find((element) => element.id === selectedId) ?? null;
  const payload = useMemo(() => JSON.stringify({ elements }), [elements]);
  const allocations = useMemo(() => {
    const map: Record<string, number> = Object.fromEntries(ticketTypes.map((t) => [t.id, 0]));
    for (const element of elements) {
      if (!isFloorPlanSeatElement(element.type) || !element.ticketTypeId) continue;
      map[element.ticketTypeId] = (map[element.ticketTypeId] ?? 0) + floorPlanSeatCount(element);
    }
    return map;
  }, [elements, ticketTypes]);
  const allocationIssues = ticketTypes
    .map((ticketType) => ({
      ticketType,
      allocated: allocations[ticketType.id] ?? 0,
    }))
    .filter((row) => row.allocated !== row.ticketType.quantity);
  const canSaveValidated = allocationIssues.length === 0 && ticketTypes.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function patchElement(id: string, patch: Partial<FloorPlanElement>) {
    setElements((prev) => prev.map((element) => (element.id === id ? { ...element, ...patch } : element)));
  }

  function fitRowedSeatElement(id: string, nextRows?: number, nextColumns?: number) {
    setElements((prev) =>
      prev.map((element) => {
        if (element.id !== id || element.type !== "rowed_seats") return element;
        const rows = nextRows ?? element.rows ?? 1;
        const columns = nextColumns ?? element.columns ?? 1;
        const fitted = fittedRowedSize(rows, columns, gridSize);
        return {
          ...element,
          rows,
          columns,
          width: Math.min(fitted.width, canvasWidth - element.x),
          height: Math.min(fitted.height, canvasHeight - element.y),
        };
      })
    );
  }

  function addElement(item: PaletteItem) {
    const x = snap(80 + elements.length * 20, gridSize);
    const y = snap(80 + elements.length * 20, gridSize);
    const defaultRowedSize = fittedRowedSize(4, 6, gridSize);
    const next: FloorPlanElement = {
      id: uid(),
      type: item.type,
      x,
      y,
      x2: item.type === "wall" ? x + item.width : undefined,
      y2: item.type === "wall" ? y : undefined,
      width: item.type === "rowed_seats" ? defaultRowedSize.width : item.width,
      height: item.type === "rowed_seats" ? defaultRowedSize.height : item.height,
      rotation: 0,
      label: item.label,
      color: item.color,
      wallStyle: item.type === "wall" ? "solid" : undefined,
      ticketTypeId: undefined,
      seatsPerTable: SEAT_TABLE_TYPES.has(item.type) ? 8 : undefined,
      rows: item.type === "rowed_seats" ? 4 : undefined,
      columns: item.type === "rowed_seats" ? 6 : undefined,
      source: "manual",
    };
    setElements((prev) => [...prev, next]);
    setSelectedId(next.id);
  }

  function importTicketGroupSeats() {
    const imported: FloorPlanElement[] = [];
    let index = 0;
    for (let ticketIndex = 0; ticketIndex < ticketTypes.length; ticketIndex++) {
      const ticketType = ticketTypes[ticketIndex];
      const color = TICKET_COLORS[ticketIndex % TICKET_COLORS.length];
      if (
        ticketType.seatLayoutMode === "tables" &&
        ticketType.seatLayoutTableCount &&
        ticketType.seatLayoutSeatsPerTable
      ) {
        for (let table = 1; table <= ticketType.seatLayoutTableCount; table++) {
          imported.push({
            id: uid(),
            type: "circle_table",
            x: snap(60 + (index % 6) * 150, gridSize),
            y: snap(60 + Math.floor(index / 6) * 150, gridSize),
            width: 110,
            height: 110,
            rotation: 0,
            label: `T${table}`,
            color,
            ticketTypeId: ticketType.id,
            seatsPerTable: ticketType.seatLayoutSeatsPerTable,
            source: "ticket_import",
          });
          index++;
        }
      } else if (
        ticketType.seatLayoutRows &&
        ticketType.seatLayoutColumns
      ) {
        const fitted = fittedRowedSize(ticketType.seatLayoutRows, ticketType.seatLayoutColumns, gridSize);
        imported.push({
          id: uid(),
          type: "rowed_seats",
          x: snap(60 + (index % 3) * 280, gridSize),
          y: snap(60 + Math.floor(index / 3) * 180, gridSize),
          width: clamp(fitted.width, 40, 1200),
          height: clamp(fitted.height, 40, 1000),
          rotation: 0,
          label: ticketType.name,
          color,
          ticketTypeId: ticketType.id,
          rows: ticketType.seatLayoutRows,
          columns: ticketType.seatLayoutColumns,
          source: "ticket_import",
        });
        index++;
      }
    }
    if (imported.length === 0) return;
    setElements((prev) => [...prev.filter((element) => element.source !== "ticket_import"), ...imported]);
    setSelectedId(imported[0]?.id ?? null);
  }

  function changeZoom(nextZoom: number) {
    setZoom(Number(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM).toFixed(1)));
  }

  function changeCanvasSize(width: number, height: number) {
    setCanvasWidth(width);
    setCanvasHeight(height);
    setElements((prev) =>
      prev.map((element) => {
        if (element.type === "wall") {
          const end = wallEnd(element);
          return {
            ...element,
            x: clamp(element.x, 0, width),
            y: clamp(element.y, 0, height),
            x2: clamp(end.x2, 0, width),
            y2: clamp(end.y2, 0, height),
          };
        }
        return {
          ...element,
          x: clamp(element.x, 0, Math.max(0, width - element.width)),
          y: clamp(element.y, 0, Math.max(0, height - element.height)),
          width: Math.min(element.width, width),
          height: Math.min(element.height, height),
        };
      })
    );
  }

  function exportPng() {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FDFAF4";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    if (showGrid) {
      drawGrid(ctx, canvasWidth, canvasHeight, gridSize);
    }
    for (const element of elements) {
      drawElement(ctx, element);
    }

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `eventuz-floor-plan-${date}.png`;
    link.click();
  }

  function duplicateSelected() {
    if (!selected) return;
    const next = {
      ...selected,
      id: uid(),
      x: clamp(selected.x + gridSize * 2, 0, canvasWidth - selected.width),
      y: clamp(selected.y + gridSize * 2, 0, canvasHeight - selected.height),
      x2: selected.x2 == null ? undefined : clamp(selected.x2 + gridSize * 2, 0, canvasWidth),
      y2: selected.y2 == null ? undefined : clamp(selected.y2 + gridSize * 2, 0, canvasHeight),
      label: `${selected.label || DEFAULT_LABELS[selected.type]} copy`,
    };
    setElements((prev) => [...prev, next]);
    setSelectedId(next.id);
  }

  function deleteSelected() {
    if (!selected) return;
    setElements((prev) => prev.filter((element) => element.id !== selected.id));
    setSelectedId(null);
  }

  function beginDrag(event: React.PointerEvent<HTMLElement>, element: FloorPlanElement, mode: DragState["mode"]) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(element.id);
    setDrag({
      id: element.id,
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: element.x,
      startY: element.y,
      startX2: wallEnd(element).x2,
      startY2: wallEnd(element).y2,
      startWidth: element.width,
      startHeight: element.height,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const dx = (event.clientX - drag.pointerX) / zoom;
    const dy = (event.clientY - drag.pointerY) / zoom;
    const element = elements.find((item) => item.id === drag.id);
    if (!element) return;
    if (element.type === "wall") {
      const startX2 = drag.startX2 ?? drag.startX + drag.startWidth;
      const startY2 = drag.startY2 ?? drag.startY;
      if (drag.mode === "wall-start") {
        const x = clamp(snap(drag.startX + dx, gridSize), 0, canvasWidth);
        const y = clamp(snap(drag.startY + dy, gridSize), 0, canvasHeight);
        patchElement(drag.id, {
          x,
          y,
          width: Math.max(gridSize, Math.round(Math.hypot(startX2 - x, startY2 - y))),
        });
        return;
      }
      if (drag.mode === "wall-end") {
        const x2 = clamp(snap(startX2 + dx, gridSize), 0, canvasWidth);
        const y2 = clamp(snap(startY2 + dy, gridSize), 0, canvasHeight);
        patchElement(drag.id, {
          x2,
          y2,
          width: Math.max(gridSize, Math.round(Math.hypot(x2 - drag.startX, y2 - drag.startY))),
        });
        return;
      }
      if (drag.mode === "move") {
        const moveX = snap(dx, gridSize);
        const moveY = snap(dy, gridSize);
        patchElement(drag.id, {
          x: clamp(drag.startX + moveX, 0, canvasWidth),
          y: clamp(drag.startY + moveY, 0, canvasHeight),
          x2: clamp(startX2 + moveX, 0, canvasWidth),
          y2: clamp(startY2 + moveY, 0, canvasHeight),
        });
        return;
      }
    }
    if (drag.mode === "move") {
      patchElement(drag.id, {
        x: clamp(snap(drag.startX + dx, gridSize), 0, canvasWidth - element.width),
        y: clamp(snap(drag.startY + dy, gridSize), 0, canvasHeight - element.height),
      });
    } else {
      patchElement(drag.id, {
        width: clamp(snap(drag.startWidth + dx, gridSize), gridSize, canvasWidth - element.x),
        height: clamp(snap(drag.startHeight + dy, gridSize), gridSize, canvasHeight - element.y),
      });
    }
  }

  function endDrag() {
    setDrag(null);
  }

  return (
    <>
      <div className="rounded-2xl border border-[#EDE8E3] bg-[#FDFAF4] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A96E]">Floor plan designer</p>
            <h3 className="mt-2 font-serif text-2xl font-light text-[#1C1714]">Edit the venue floor plan in a larger workspace.</h3>
            <p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-[#7A6E68]">
              The designer opens as a large modal so the canvas, toolbar, and properties stay usable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-sm bg-[#1C1714] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#342720]"
          >
            Open Floor Plan Designer
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1714]/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Floor plan designer"
        >
          <div className="flex h-[92vh] w-[96vw] max-w-[110rem] flex-col overflow-hidden rounded-2xl border border-[#EDE8E3] bg-[#FDFAF4] shadow-2xl">
            <form action={saveFloorPlanLayout} className="flex min-h-0 flex-1 flex-col gap-5 p-5">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="layout_json" value={payload} />
      <input type="hidden" name="canvas_width" value={canvasWidth} />
      <input type="hidden" name="canvas_height" value={canvasHeight} />

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#EDE8E3] bg-[#FDFAF4] p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A96E]">Floor plan designer</p>
          <p className="mt-1 max-w-2xl text-sm font-light leading-relaxed text-[#7A6E68]">
            Build a visual venue draft on a {gridSize}px snap grid. This does not change live attendee seat selection yet.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={importTicketGroupSeats}
              className="rounded-sm border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6914] transition-colors hover:bg-[#C9A96E]/20"
            >
              Import ticket group seats
            </button>
            <button
              type="button"
              onClick={exportPng}
              className="rounded-sm border border-[#1C1714]/20 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1C1714] transition-colors hover:border-[#C9A96E]"
            >
              Export PNG
            </button>
            <label className="flex items-center gap-2 rounded-sm border border-[#EDE8E3] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A6E68]">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(event) => setShowGrid(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#C9A96E]"
              />
              Show grid
            </label>
            <label className="flex items-center gap-2 rounded-sm border border-[#EDE8E3] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A6E68]">
              Canvas
              <select
                className="bg-transparent text-[11px] normal-case tracking-normal text-[#1C1714] focus:outline-none"
                value={`${canvasWidth}x${canvasHeight}`}
                onChange={(event) => {
                  const preset = CANVAS_SIZE_PRESETS.find(
                    (item) => `${item.width}x${item.height}` === event.target.value
                  );
                  if (preset) changeCanvasSize(preset.width, preset.height);
                }}
              >
                {CANVAS_SIZE_PRESETS.map((preset) => (
                  <option key={preset.label} value={`${preset.width}x${preset.height}`}>
                    {preset.label} ({preset.width}x{preset.height})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="min-w-[18rem] rounded-xl border border-[#EDE8E3] bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A6E68]">Ticket counter</p>
            <span className={canSaveValidated ? "text-xs font-medium text-success" : "text-xs font-medium text-destructive"}>
              {canSaveValidated ? "Balanced" : "Mismatch"}
            </span>
          </div>
          <div className="space-y-2">
            {ticketTypes.map((ticketType) => {
              const allocated = allocations[ticketType.id] ?? 0;
              const balanced = allocated === ticketType.quantity;
              return (
                <div key={ticketType.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-[#1C1714]">{ticketType.name}</span>
                  <span className={balanced ? "font-semibold text-success" : "font-semibold text-destructive"}>
                    {allocated}/{ticketType.quantity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-[#EDE8E3] bg-white p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A6E68]">Zoom</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="rounded border border-[#EDE8E3] px-3 py-1 text-xs disabled:opacity-35"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => changeZoom(1)}
              className="min-w-14 rounded border border-[#EDE8E3] px-3 py-1 text-xs font-semibold"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => changeZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="rounded border border-[#EDE8E3] px-3 py-1 text-xs disabled:opacity-35"
            >
              +
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-sm border border-[#EDE8E3] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A6E68] transition-colors hover:border-[#C9A96E]"
        >
          Close
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[14rem_minmax(0,1fr)_18rem]">
        <aside className="space-y-4 overflow-auto rounded-2xl border border-[#EDE8E3] bg-white p-4">
          {GROUPS.map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A96E]">{group}</p>
              <div className="grid gap-2">
                {PALETTE.filter((item) => item.group === group).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => addElement(item)}
                    className="rounded-sm border border-[#EDE8E3] bg-[#FDFAF4] px-3 py-2 text-left text-xs text-[#1C1714] transition-colors hover:border-[#C9A96E]/60 hover:bg-[#C9A96E]/10"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="overflow-auto rounded-2xl border border-[#EDE8E3] bg-white p-4">
          <div
            className="relative mx-auto"
            style={{
              width: canvasWidth * zoom,
              height: canvasHeight * zoom,
            }}
          >
            <div
              ref={canvasRef}
              className="relative origin-top-left overflow-hidden border border-[#D9D2CA] bg-[#FDFAF4]"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transform: `scale(${zoom})`,
                backgroundImage: showGrid
                  ? "linear-gradient(to right, rgba(201,169,110,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(201,169,110,.18) 1px, transparent 1px)"
                  : "none",
                backgroundSize: `${gridSize}px ${gridSize}px`,
              }}
              onPointerMove={updateDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClick={() => setSelectedId(null)}
            >
            {elements.map((element) => {
              const selectedElement = selectedId === element.id;
              if (element.type === "wall") {
                const metrics = wallMetrics(element);
                return (
                  <div
                    key={element.id}
                    className="absolute select-none"
                    style={{
                      left: element.x,
                      top: element.y - 10,
                      width: metrics.length,
                      height: 20,
                      transform: `rotate(${metrics.angle}rad)`,
                      transformOrigin: "0 10px",
                    }}
                    onPointerDown={(event) => beginDrag(event, element, "move")}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(element.id);
                    }}
                  >
                    <div
                      className={
                        "absolute left-0 top-1/2 -translate-y-1/2 " +
                        (selectedElement ? "ring-2 ring-[#C9A96E]/50" : "")
                      }
                      style={{
                        width: metrics.length,
                        borderTop:
                          element.wallStyle === "dotted"
                            ? `4px dotted ${element.color}`
                            : element.wallStyle === "dashed"
                              ? `4px dashed ${element.color}`
                              : `4px solid ${element.color}`,
                      }}
                    />
                    {selectedElement ? (
                      <>
                        <button
                          type="button"
                          aria-label="Move wall start"
                          className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab border border-[#1C1714] bg-[#C9A96E]"
                          onPointerDown={(event) => beginDrag(event, element, "wall-start")}
                        />
                        <button
                          type="button"
                          aria-label="Move wall end"
                          className="absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-grab border border-[#1C1714] bg-[#C9A96E]"
                          onPointerDown={(event) => beginDrag(event, element, "wall-end")}
                        />
                      </>
                    ) : null}
                  </div>
                );
              }
              return (
                <div
                  key={element.id}
                  className={elementClasses(element, selectedElement)}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    backgroundColor: element.type === "text" ? "transparent" : element.color,
                    color: element.type === "text" ? element.color : "#1C1714",
                    transform: `rotate(${element.rotation}deg)`,
                    transformOrigin: "center",
                  }}
                  onPointerDown={(event) => beginDrag(event, element, "move")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(element.id);
                  }}
                >
                  <div className="relative flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.08em]">
                    {element.type === "rowed_seats" ? <RowedSeatPreview element={element} /> : null}
                    <span className={element.type === "rowed_seats" ? "absolute -top-5 left-0 z-10 rounded bg-[#FDFAF4]/90 px-1.5 py-0.5 text-[10px]" : "relative z-10 break-words p-2"}>
                      {element.label}
                    </span>
                  </div>
                  <SeatMarkers element={element} />
                  {selectedElement ? (
                    <button
                      type="button"
                      aria-label="Resize component"
                      className="absolute bottom-0 right-0 h-4 w-4 translate-x-1 translate-y-1 cursor-se-resize rounded-sm border border-[#1C1714] bg-[#C9A96E]"
                      onPointerDown={(event) => beginDrag(event, element, "resize")}
                    />
                  ) : null}
                </div>
              );
            })}
            </div>
          </div>
        </div>

        <aside className="overflow-auto rounded-2xl border border-[#EDE8E3] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A96E]">Properties</p>
            <div className="flex gap-2">
              <button type="button" onClick={duplicateSelected} disabled={!selected} className="rounded border border-[#EDE8E3] px-2 py-1 text-xs disabled:opacity-35">
                Duplicate
              </button>
              <button type="button" onClick={deleteSelected} disabled={!selected} className="rounded border border-destructive/25 bg-destructive-muted px-2 py-1 text-xs text-destructive disabled:opacity-35">
                Delete
              </button>
            </div>
          </div>

          {selected ? (
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Label</span>
                <input className="input-eventuz" value={selected.label} onChange={(e) => patchElement(selected.id, { label: e.target.value })} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Color</span>
                <input type="color" className="h-10 w-full rounded border border-[#EDE8E3] bg-white p-1" value={selected.color} onChange={(e) => patchElement(selected.id, { color: e.target.value })} />
              </label>

              {selected.type === "wall" ? (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Wall design</span>
                  <select
                    className="input-eventuz"
                    value={selected.wallStyle ?? "solid"}
                    onChange={(e) =>
                      patchElement(selected.id, {
                        wallStyle: e.target.value as FloorPlanElement["wallStyle"],
                      })
                    }
                  >
                    <option value="solid">Straight line</option>
                    <option value="dashed">Broken line</option>
                    <option value="dotted">Dotted line</option>
                  </select>
                </label>
              ) : null}

              {isFloorPlanSeatElement(selected.type) ? (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Ticket group</span>
                  <select className="input-eventuz" value={selected.ticketTypeId ?? ""} onChange={(e) => patchElement(selected.id, { ticketTypeId: e.target.value })}>
                    <option value="">Choose ticket group</option>
                    {ticketTypes.map((ticketType) => (
                      <option key={ticketType.id} value={ticketType.id}>{ticketType.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {SEAT_TABLE_TYPES.has(selected.type) ? (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Seats per table</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className="input-eventuz"
                    value={selected.seatsPerTable ?? 8}
                    onChange={(e) => patchElement(selected.id, { seatsPerTable: clamp(Number(e.target.value), 1, 12) })}
                  />
                </label>
              ) : null}

              {selected.type === "rowed_seats" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Rows</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="input-eventuz"
                        value={selected.rows ?? 1}
                        onChange={(e) =>
                          fitRowedSeatElement(
                            selected.id,
                            clamp(Number(e.target.value), 1, 100),
                            selected.columns ?? 1
                          )
                        }
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Columns</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="input-eventuz"
                        value={selected.columns ?? 1}
                        onChange={(e) =>
                          fitRowedSeatElement(
                            selected.id,
                            selected.rows ?? 1,
                            clamp(Number(e.target.value), 1, 100)
                          )
                        }
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => fitRowedSeatElement(selected.id)}
                    className="w-full rounded-sm border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6914] transition-colors hover:bg-[#C9A96E]/20"
                  >
                    Fit box to seats
                  </button>
                </div>
              ) : null}

              {selected.type === "wall" ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Start X</span>
                    <input type="number" step={gridSize} className="input-eventuz" value={selected.x} onChange={(e) => patchElement(selected.id, { x: clamp(snap(Number(e.target.value), gridSize), 0, canvasWidth) })} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Start Y</span>
                    <input type="number" step={gridSize} className="input-eventuz" value={selected.y} onChange={(e) => patchElement(selected.id, { y: clamp(snap(Number(e.target.value), gridSize), 0, canvasHeight) })} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">End X</span>
                    <input type="number" step={gridSize} className="input-eventuz" value={wallEnd(selected).x2} onChange={(e) => patchElement(selected.id, { x2: clamp(snap(Number(e.target.value), gridSize), 0, canvasWidth) })} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">End Y</span>
                    <input type="number" step={gridSize} className="input-eventuz" value={wallEnd(selected).y2} onChange={(e) => patchElement(selected.id, { y2: clamp(snap(Number(e.target.value), gridSize), 0, canvasHeight) })} />
                  </label>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">X</span>
                      <input type="number" step={gridSize} className="input-eventuz" value={selected.x} onChange={(e) => patchElement(selected.id, { x: clamp(snap(Number(e.target.value), gridSize), 0, canvasWidth - selected.width) })} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Y</span>
                      <input type="number" step={gridSize} className="input-eventuz" value={selected.y} onChange={(e) => patchElement(selected.id, { y: clamp(snap(Number(e.target.value), gridSize), 0, canvasHeight - selected.height) })} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Width</span>
                      <input type="number" step={gridSize} className="input-eventuz" value={selected.width} onChange={(e) => patchElement(selected.id, { width: clamp(snap(Number(e.target.value), gridSize), gridSize, canvasWidth - selected.x) })} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Height</span>
                      <input type="number" step={gridSize} className="input-eventuz" value={selected.height} onChange={(e) => patchElement(selected.id, { height: clamp(snap(Number(e.target.value), gridSize), gridSize, canvasHeight - selected.y) })} />
                    </label>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Rotation</span>
                    <input type="number" min={-180} max={180} className="input-eventuz" value={selected.rotation} onChange={(e) => patchElement(selected.id, { rotation: clamp(Number(e.target.value), -180, 180) })} />
                  </label>
                </>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-[#EDE8E3] bg-[#FDFAF4] p-4 text-sm font-light leading-relaxed text-[#7A6E68]">
              Select a component on the canvas to edit its label, color, size, and ticket group.
            </p>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#EDE8E3] bg-white p-4">
        <div className="text-sm font-light text-[#7A6E68]">
          {!canSaveValidated ? (
            <span>
              Save a draft anytime, or balance every imported/assigned ticket group before saving a validated floor plan.{" "}
              {allocationIssues[0] ? `${allocationIssues[0].ticketType.name} is not balanced.` : ""}
            </span>
          ) : (
            <span>All ticket groups match their configured quantities.</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <SaveButton disabled={false} label="Save draft" mode="draft" />
          <SaveButton disabled={!canSaveValidated} label="Save validated floor plan" mode="validated" />
        </div>
      </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
