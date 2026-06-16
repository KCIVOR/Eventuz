"use client";

import { saveFloorPlanLayout } from "@/app/organizer/events/actions";
import {
  FLOOR_PLAN_CANVAS_HEIGHT,
  FLOOR_PLAN_CANVAS_WIDTH,
  FLOOR_PLAN_BACKGROUND_COLOR,
  FLOOR_PLAN_GRID_SIZE,
  floorPlanSeatCount,
  isFloorPlanSeatElement,
  type FloorPlanElement,
  type FloorPlanElementType,
  type FloorPlanLayout,
  type FloorPlanTicketType,
} from "@/lib/organizer/floorPlan";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
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
  mode: "move" | "resize" | "line-start" | "line-end";
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
  startX2?: number;
  startY2?: number;
  startWidth: number;
  startHeight: number;
  groupStarts?: Array<{
    id: string;
    type: FloorPlanElementType;
    x: number;
    y: number;
    x2?: number;
    y2?: number;
    width: number;
    height: number;
  }>;
};

type SelectionBoxState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
};

type ContextMenuState = {
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
  targetId: string | null;
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
  { type: "window", label: "Window", group: "Structure", width: 140, height: 8, color: "#8FB7C9" },
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
const TABLE_DEFAULT_SIZES: Record<"circle_table" | "square_table" | "rectangle_table", { width: number; height: number }> = {
  circle_table: { width: 120, height: 120 },
  square_table: { width: 120, height: 120 },
  rectangle_table: { width: 180, height: 100 },
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `fp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function snap(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cssPx(value: number) {
  return `${Number(value.toFixed(3))}px`;
}

function isTableElement(type: FloorPlanElementType) {
  return SEAT_TABLE_TYPES.has(type);
}

function ticketTypeOptionsForElement(
  ticketTypes: FloorPlanTicketType[],
  element: FloorPlanElement
) {
  if (isTableElement(element.type)) {
    return ticketTypes.filter((ticketType) => ticketType.seatLayoutMode === "tables");
  }
  if (element.type === "rowed_seats") {
    return ticketTypes.filter((ticketType) => ticketType.seatLayoutMode === "rowed");
  }
  return ticketTypes;
}

function isLineElement(type: FloorPlanElementType) {
  return type === "wall" || type === "window";
}

function isAccessElement(type: FloorPlanElementType) {
  return type === "door" || type === "entrance" || type === "exit";
}

function outlineColor(element: FloorPlanElement) {
  return element.outlineColor ?? "#1C1714";
}

function outlineWidth(element: FloorPlanElement) {
  return clamp(element.outlineWidth ?? 1, 0, 12);
}

function labelOrientationStyle(element: FloorPlanElement): CSSProperties | undefined {
  if (!element.keepLabelHorizontal || element.rotation === 0) return undefined;
  return { transform: `rotate(${-element.rotation}deg)` };
}

function lineEnd(element: FloorPlanElement) {
  return {
    x2: element.x2 ?? element.x + element.width,
    y2: element.y2 ?? element.y,
  };
}

function lineMetrics(element: FloorPlanElement) {
  const { x2, y2 } = lineEnd(element);
  const dx = x2 - element.x;
  const dy = y2 - element.y;
  return {
    x2,
    y2,
    length: Math.max(1, Math.hypot(dx, dy)),
    angle: Math.atan2(dy, dx),
  };
}

function elementBounds(element: FloorPlanElement) {
  if (isLineElement(element.type)) {
    const { x2, y2 } = lineEnd(element);
    const padding = Math.max(8, element.height ?? 4);
    return {
      left: Math.min(element.x, x2) - padding,
      top: Math.min(element.y, y2) - padding,
      right: Math.max(element.x, x2) + padding,
      bottom: Math.max(element.y, y2) + padding,
    };
  }
  return {
    left: element.x,
    top: element.y,
    right: element.x + element.width,
    bottom: element.y + element.height,
  };
}

function normalizedBox(box: SelectionBoxState) {
  return {
    left: Math.min(box.startX, box.currentX),
    top: Math.min(box.startY, box.currentY),
    right: Math.max(box.startX, box.currentX),
    bottom: Math.max(box.startY, box.currentY),
  };
}

function boxesIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
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

function normalizeBackgroundColor(layout: FloorPlanLayout): string {
  return /^#[0-9a-fA-F]{6}$/.test(String(layout.backgroundColor ?? ""))
    ? String(layout.backgroundColor)
    : FLOOR_PLAN_BACKGROUND_COLOR;
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
  const cleanAccessSymbol =
    isAccessElement(element.type) && (element.doorStyle ?? "classic") !== "classic";
  const base = cleanAccessSymbol
    ? "absolute select-none text-center transition-shadow"
    : "absolute select-none border text-center shadow-sm transition-shadow";
  const selectedClass = selected
    ? cleanAccessSymbol
      ? " ring-2 ring-[#C9A96E]/50"
      : " border-[#1C1714] ring-2 ring-[#C9A96E]/50"
    : cleanAccessSymbol
      ? " hover:ring-2 hover:ring-[#C9A96E]/40"
      : " border-[#1C1714]/20 hover:border-[#C9A96E]";
  const radius =
    cleanAccessSymbol
      ? " border-transparent bg-transparent shadow-none"
      : element.type === "circle_table"
      ? " rounded-full"
      : element.type === "text"
        ? " rounded-none border-transparent bg-transparent shadow-none"
        : " rounded-sm";
  return `${base}${selectedClass}${radius}`;
}

function tableSeatMarkerSize(element: FloorPlanElement) {
  return clamp(element.tableSeatSize ?? 16, 10, 32);
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

  if (distance < outerWidth) {
    return { x: -rx + distance, y: -ry, angleDeg: 0 };
  }
  if (distance < outerWidth + outerHeight) {
    return { x: rx, y: -ry + (distance - outerWidth), angleDeg: 90 };
  }
  if (distance < outerWidth * 2 + outerHeight) {
    return { x: rx - (distance - outerWidth - outerHeight), y: ry, angleDeg: 0 };
  }
  return { x: -rx, y: ry - (distance - outerWidth * 2 - outerHeight), angleDeg: 90 };
}

function SeatMarkers({ element }: { element: FloorPlanElement }) {
  const count = Math.min(floorPlanSeatCount(element), 24);
  if (count <= 0 || element.type === "rowed_seats") return null;
  const markerSize = tableSeatMarkerSize(element);
  const half = markerSize / 2;
  const showNumbers = element.showTableSeatNumbers === true;
  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const marker = tableSeatPosition(element, index, count, markerSize);
        return (
          <span
            key={index}
            className="absolute flex items-center justify-center border border-[#1C1714]/25 bg-[#FDFAF4] text-[#1C1714] shadow-[0_1px_2px_rgba(28,23,20,0.12)]"
            style={{
              left: cssPx(element.width / 2 + marker.x - half),
              top: cssPx(element.height / 2 + marker.y - half),
              width: cssPx(markerSize),
              height: cssPx(markerSize),
              transform: `rotate(${marker.angleDeg}deg)`,
              fontSize: cssPx(Math.max(8, Math.min(12, markerSize * 0.55))),
            }}
          >
            {showNumbers ? (
              <span style={{ transform: `rotate(${-marker.angleDeg}deg)` }}>{index + 1}</span>
            ) : null}
          </span>
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

function doorStyle(element: FloorPlanElement) {
  return isAccessElement(element.type) ? element.doorStyle ?? "classic" : "classic";
}

function DoorPreview({ element }: { element: FloorPlanElement }) {
  if (!isAccessElement(element.type) || doorStyle(element) === "classic") return null;
  const stroke = outlineColor(element);
  const double = doorStyle(element) === "double";
  const width = Math.max(1, element.width);
  const height = Math.max(1, element.height);
  const jamb = Math.min(12, Math.max(5, width * 0.07));
  const strokeWidth = Math.max(1.5, outlineWidth(element));
  const centerX = width / 2;
  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {double ? (
        <>
          <rect x="0" y="0" width={jamb} height={height} fill={stroke} />
          <rect x={width - jamb} y="0" width={jamb} height={height} fill={stroke} />
          <path d={`M ${jamb} 0 Q ${centerX} 0 ${centerX} ${height}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          <path d={`M ${width - jamb} 0 Q ${centerX} 0 ${centerX} ${height}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          <path d={`M ${centerX} ${height} L ${centerX} ${Math.max(0, height - 10)}`} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="0" y="0" width={jamb} height={height} fill={stroke} />
          <path d={`M ${jamb} 0 Q ${width} 0 ${width} ${height}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )}
    </svg>
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
  const markerSize = tableSeatMarkerSize(element);
  const half = markerSize / 2;
  const showNumbers = element.showTableSeatNumbers === true;
  for (let index = 0; index < count; index++) {
    const marker = tableSeatPosition(element, index, count, markerSize);
    const angle = (marker.angleDeg * Math.PI) / 180;
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#FDFAF4";
    ctx.strokeStyle = "rgba(28, 23, 20, 0.35)";
    ctx.lineWidth = 1;
    ctx.fillRect(-half, -half, markerSize, markerSize);
    ctx.strokeRect(-half, -half, markerSize, markerSize);
    if (showNumbers) {
      ctx.rotate(-angle);
      ctx.fillStyle = "#1C1714";
      ctx.font = `700 ${Math.max(8, Math.min(12, markerSize * 0.55))}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), 0, 0);
    }
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

function drawDoorSymbol(ctx: CanvasRenderingContext2D, element: FloorPlanElement) {
  const style = doorStyle(element);
  if (style === "classic") return false;
  const w = element.width;
  const h = element.height;
  const jamb = Math.min(12, Math.max(5, w * 0.07));
  const strokeWidth = Math.max(1.5, outlineWidth(element));
  const top = -h / 2;
  const bottom = h / 2;
  const left = -w / 2;
  const right = w / 2;
  const leftInner = left + jamb;
  const rightInner = right - jamb;
  ctx.save();
  ctx.strokeStyle = outlineColor(element);
  ctx.fillStyle = outlineColor(element);
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "square";

  if (style === "double") {
    ctx.fillRect(left, top, jamb, h);
    ctx.fillRect(rightInner, top, jamb, h);
    ctx.beginPath();
    ctx.moveTo(leftInner, top);
    ctx.quadraticCurveTo(0, top, 0, bottom);
    ctx.moveTo(rightInner, top);
    ctx.quadraticCurveTo(0, top, 0, bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, bottom);
    ctx.lineTo(0, Math.max(top, bottom - 10));
    ctx.stroke();
  } else {
    ctx.fillRect(left, top, jamb, h);
    ctx.beginPath();
    ctx.moveTo(leftInner, top);
    ctx.quadraticCurveTo(right, top, right, bottom);
    ctx.stroke();
  }
  ctx.restore();
  return true;
}

function drawElement(ctx: CanvasRenderingContext2D, element: FloorPlanElement) {
  if (isLineElement(element.type)) {
    const { x2, y2 } = lineEnd(element);
    const lineWidth = element.type === "window"
      ? Math.max(6, Math.min(14, element.height || 8))
      : Math.max(3, Math.min(8, element.height || 4));
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = element.type === "window" ? "butt" : "round";
    ctx.setLineDash(element.type === "wall" ? wallDash(element.wallStyle, lineWidth) : []);
    ctx.beginPath();
    ctx.moveTo(element.x, element.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (element.type === "window") {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#FDFAF4";
      ctx.beginPath();
      ctx.moveTo(element.x, element.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
  ctx.rotate((element.rotation * Math.PI) / 180);

  const accessSymbolDrawn = isAccessElement(element.type) && drawDoorSymbol(ctx, element);

  if (element.type !== "text" && !accessSymbolDrawn) {
    ctx.fillStyle = element.color;
    ctx.strokeStyle = outlineColor(element);
    ctx.lineWidth = outlineWidth(element);
    ctx.beginPath();
    if (element.type === "circle_table") {
      ctx.ellipse(0, 0, element.width / 2, element.height / 2, 0, 0, Math.PI * 2);
    } else {
      ctx.rect(-element.width / 2, -element.height / 2, element.width, element.height);
    }
    ctx.fill();
    if (outlineWidth(element) > 0) {
      ctx.stroke();
    }
  }

  if (isTableElement(element.type)) {
    drawTableSeatMarkers(ctx, element);
  }
  if (element.type === "rowed_seats") {
    drawRowedSeats(ctx, element);
  }

  ctx.save();
  if (element.keepLabelHorizontal && element.rotation !== 0) {
    ctx.rotate((-element.rotation * Math.PI) / 180);
  }
  ctx.fillStyle = element.type === "text" ? element.color : "#1C1714";
  ctx.font = "700 12px Arial, sans-serif";
  if (element.type === "rowed_seats" || accessSymbolDrawn) {
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
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (elements[0]?.id ? [elements[0].id] : []));
  const [focusedId, setFocusedId] = useState<string | null>(elements[0]?.id ?? null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(initialCanvasWidth);
  const [canvasHeight, setCanvasHeight] = useState(initialCanvasHeight);
  const [backgroundColor, setBackgroundColor] = useState(() => normalizeBackgroundColor(initialLayout));
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copiedElement, setCopiedElement] = useState<FloorPlanElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selected = elements.find((element) => element.id === focusedId) ?? null;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedElements = useMemo(
    () => elements.filter((element) => selectedIdSet.has(element.id)),
    [elements, selectedIdSet]
  );
  const payload = useMemo(() => JSON.stringify({ elements, backgroundColor }), [backgroundColor, elements]);
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
  const selectedTicketType = selected?.ticketTypeId
    ? ticketTypes.find((ticketType) => ticketType.id === selected.ticketTypeId) ?? null
    : null;
  const selectedTicketTypeOptions = selected
    ? ticketTypeOptionsForElement(ticketTypes, selected)
    : ticketTypes;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
        return;
      }
      if (!event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        changeZoom(zoom + ZOOM_STEP);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        changeZoom(zoom - ZOOM_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        changeZoom(1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, zoom]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    }
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [isOpen, zoom]);

  function patchElement(id: string, patch: Partial<FloorPlanElement>) {
    setElements((prev) => prev.map((element) => (element.id === id ? { ...element, ...patch } : element)));
  }

  function usedTableNumbers(ticketTypeId: string, currentElementId: string) {
    return new Set(
      elements
        .filter(
          (element) =>
            element.id !== currentElementId &&
            isTableElement(element.type) &&
            element.ticketTypeId === ticketTypeId &&
            typeof element.ticketTableNumber === "number"
        )
        .map((element) => element.ticketTableNumber as number)
    );
  }

  function firstAvailableTableNumber(ticketType: FloorPlanTicketType, currentElementId: string) {
    const tableCount = ticketType.seatLayoutTableCount ?? 0;
    if (tableCount < 1) return undefined;
    const used = usedTableNumbers(ticketType.id, currentElementId);
    for (let table = 1; table <= tableCount; table++) {
      if (!used.has(table)) return table;
    }
    return undefined;
  }

  function handleSeatTicketGroupChange(element: FloorPlanElement, ticketTypeId: string) {
    if (!ticketTypeId) {
      patchElement(element.id, { ticketTypeId: undefined, ticketTableNumber: undefined });
      return;
    }

    const ticketType = ticketTypes.find((item) => item.id === ticketTypeId);
    if (!ticketType) return;
    if (isTableElement(element.type)) {
      patchElement(element.id, {
        ticketTypeId,
        ticketTableNumber: firstAvailableTableNumber(ticketType, element.id),
        seatsPerTable: ticketType.seatLayoutSeatsPerTable ?? element.seatsPerTable ?? 8,
      });
      return;
    }
    patchElement(element.id, { ticketTypeId, ticketTableNumber: undefined });
  }

  function handleTicketTableChange(element: FloorPlanElement, tableNumber: number | undefined) {
    patchElement(element.id, { ticketTableNumber: tableNumber });
  }

  function selectOnly(id: string | null) {
    setFocusedId(id);
    setSelectedIds(id ? [id] : []);
  }

  function selectMany(ids: string[], focusId: string | null = ids[ids.length - 1] ?? null) {
    const uniqueIds = Array.from(new Set(ids));
    setSelectedIds(uniqueIds);
    setFocusedId(focusId && uniqueIds.includes(focusId) ? focusId : uniqueIds[uniqueIds.length - 1] ?? null);
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      setFocusedId(exists ? next[next.length - 1] ?? null : id);
      return next;
    });
  }

  function canvasPoint(event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clamp((event.clientX - rect.left) / zoom, 0, canvasWidth),
      y: clamp((event.clientY - rect.top) / zoom, 0, canvasHeight),
    };
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

  function addElementAt(item: PaletteItem, xInput: number, yInput: number) {
    const x = clamp(snap(xInput, gridSize), 0, Math.max(0, canvasWidth - item.width));
    const y = clamp(snap(yInput, gridSize), 0, Math.max(0, canvasHeight - item.height));
    const defaultRowedSize = fittedRowedSize(4, 6, gridSize);
    const width = item.type === "rowed_seats" ? defaultRowedSize.width : item.width;
    const height = item.type === "rowed_seats" ? defaultRowedSize.height : item.height;
    const next: FloorPlanElement = {
      id: uid(),
      type: item.type,
      x,
      y,
      x2: isLineElement(item.type) ? x + width : undefined,
      y2: isLineElement(item.type) ? y : undefined,
      width,
      height,
      rotation: 0,
      label: item.label,
      color: item.color,
      outlineColor: "#1C1714",
      outlineWidth: 1,
      keepLabelHorizontal: false,
      wallStyle: item.type === "wall" ? "solid" : undefined,
      doorStyle: isAccessElement(item.type) ? "classic" : undefined,
      ticketTypeId: undefined,
      ticketTableNumber: undefined,
      seatsPerTable: SEAT_TABLE_TYPES.has(item.type) ? 8 : undefined,
      tableSeatSize: SEAT_TABLE_TYPES.has(item.type) ? 16 : undefined,
      showTableSeatNumbers: SEAT_TABLE_TYPES.has(item.type) ? false : undefined,
      rows: item.type === "rowed_seats" ? 4 : undefined,
      columns: item.type === "rowed_seats" ? 6 : undefined,
      source: "manual",
    };
    setElements((prev) => [...prev, next]);
    selectOnly(next.id);
    setContextMenu(null);
  }

  function addElement(item: PaletteItem) {
    addElementAt(item, 80 + elements.length * 20, 80 + elements.length * 20);
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
            outlineColor: "#1C1714",
            outlineWidth: 1,
            keepLabelHorizontal: false,
            ticketTypeId: ticketType.id,
            ticketTableNumber: table,
            seatsPerTable: ticketType.seatLayoutSeatsPerTable,
            tableSeatSize: 16,
            showTableSeatNumbers: false,
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
          outlineColor: "#1C1714",
          outlineWidth: 1,
          keepLabelHorizontal: false,
          ticketTypeId: ticketType.id,
          ticketTableNumber: undefined,
          rows: ticketType.seatLayoutRows,
          columns: ticketType.seatLayoutColumns,
          source: "ticket_import",
        });
        index++;
      }
    }
    if (imported.length === 0) return;
    setElements((prev) => [...prev.filter((element) => element.source !== "ticket_import"), ...imported]);
    selectMany(imported.map((element) => element.id), imported[0]?.id ?? null);
  }

  function changeZoom(nextZoom: number) {
    setZoom(Number(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM).toFixed(1)));
  }

  function changeCanvasSize(width: number, height: number) {
    setCanvasWidth(width);
    setCanvasHeight(height);
    setElements((prev) =>
      prev.map((element) => {
        if (isLineElement(element.type)) {
          const end = lineEnd(element);
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

    ctx.fillStyle = backgroundColor;
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

  function cloneElementAt(source: FloorPlanElement, xInput: number, yInput: number): FloorPlanElement {
    const x = clamp(snap(xInput, gridSize), 0, Math.max(0, canvasWidth - source.width));
    const y = clamp(snap(yInput, gridSize), 0, Math.max(0, canvasHeight - source.height));
    if (isLineElement(source.type)) {
      const end = lineEnd(source);
      const dx = end.x2 - source.x;
      const dy = end.y2 - source.y;
      return {
        ...source,
        id: uid(),
        x,
        y,
        x2: clamp(snap(x + dx, gridSize), 0, canvasWidth),
        y2: clamp(snap(y + dy, gridSize), 0, canvasHeight),
        source: "manual",
      };
    }
    return {
      ...source,
      id: uid(),
      x,
      y,
      source: "manual",
    };
  }

  function duplicateSelected() {
    if (selectedElements.length === 0) return;
    const nextElements = selectedElements.map((element) => ({
      ...cloneElementAt(element, element.x + gridSize * 2, element.y + gridSize * 2),
      label: `${element.label || DEFAULT_LABELS[element.type]} copy`,
    }));
    setElements((prev) => [...prev, ...nextElements]);
    selectMany(nextElements.map((element) => element.id), nextElements[nextElements.length - 1]?.id ?? null);
    setContextMenu(null);
  }

  function deleteSelected() {
    if (selectedElements.length === 0) return;
    const deleteIds = new Set(selectedElements.map((element) => element.id));
    setElements((prev) => prev.filter((element) => !deleteIds.has(element.id)));
    selectOnly(null);
    setContextMenu(null);
  }

  function copySelected() {
    if (!selected) return;
    setCopiedElement(selected);
    setContextMenu(null);
  }

  function pasteCopiedAt(x: number, y: number) {
    if (!copiedElement) return;
    const next = cloneElementAt(copiedElement, x, y);
    setElements((prev) => [...prev, next]);
    selectOnly(next.id);
    setContextMenu(null);
  }

  function openContextMenu(
    event: React.MouseEvent<HTMLElement>,
    targetId: string | null = null
  ) {
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasX = clamp(snap((event.clientX - rect.left) / zoom, gridSize), 0, canvasWidth);
    const canvasY = clamp(snap((event.clientY - rect.top) / zoom, gridSize), 0, canvasHeight);
    if (targetId) {
      if (!selectedIds.includes(targetId)) {
        selectOnly(targetId);
      } else {
        setFocusedId(targetId);
      }
    } else {
      selectOnly(null);
    }
    setContextMenu({
      screenX: event.clientX,
      screenY: event.clientY,
      canvasX,
      canvasY,
      targetId,
    });
  }

  function changeTableShape(id: string, nextType: "circle_table" | "square_table" | "rectangle_table") {
    setElements((prev) =>
      prev.map((element) => {
        if (element.id !== id || !SEAT_TABLE_TYPES.has(element.type)) return element;
        const currentType = element.type as "circle_table" | "square_table" | "rectangle_table";
        const currentDefault = TABLE_DEFAULT_SIZES[currentType];
        const nextDefault = TABLE_DEFAULT_SIZES[nextType];
        const shouldUseDefaultSize =
          element.width === currentDefault.width && element.height === currentDefault.height;
        const width = shouldUseDefaultSize ? nextDefault.width : element.width;
        const height = shouldUseDefaultSize ? nextDefault.height : element.height;
        return {
          ...element,
          type: nextType,
          width: Math.min(width, canvasWidth - element.x),
          height: Math.min(height, canvasHeight - element.y),
        };
      })
    );
  }

  function beginDrag(event: React.PointerEvent<HTMLElement>, element: FloorPlanElement, mode: DragState["mode"]) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null);
    const isSelected = selectedIds.includes(element.id);
    if (event.ctrlKey || event.metaKey) {
      toggleSelection(element.id);
      return;
    }
    if (!isSelected) {
      selectOnly(element.id);
    } else {
      setFocusedId(element.id);
    }
    const groupStarts =
      mode === "move" && (isSelected ? selectedElements.length > 1 : false)
        ? selectedElements.map((item) => ({
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            x2: lineEnd(item).x2,
            y2: lineEnd(item).y2,
            width: item.width,
            height: item.height,
          }))
        : undefined;
    setDrag({
      id: element.id,
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: element.x,
      startY: element.y,
      startX2: lineEnd(element).x2,
      startY2: lineEnd(element).y2,
      startWidth: element.width,
      startHeight: element.height,
      groupStarts,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (selectionBox) {
      const point = canvasPoint(event);
      setSelectionBox((prev) => prev ? { ...prev, currentX: point.x, currentY: point.y } : prev);
      return;
    }
    if (!drag) return;
    const dx = (event.clientX - drag.pointerX) / zoom;
    const dy = (event.clientY - drag.pointerY) / zoom;
    const element = elements.find((item) => item.id === drag.id);
    if (!element) return;
    if (drag.mode === "move" && drag.groupStarts && drag.groupStarts.length > 1) {
      const moveX = snap(dx, gridSize);
      const moveY = snap(dy, gridSize);
      const startMap = new Map(drag.groupStarts.map((item) => [item.id, item]));
      setElements((prev) =>
        prev.map((item) => {
          const start = startMap.get(item.id);
          if (!start) return item;
          if (isLineElement(start.type)) {
            return {
              ...item,
              x: clamp(start.x + moveX, 0, canvasWidth),
              y: clamp(start.y + moveY, 0, canvasHeight),
              x2: clamp((start.x2 ?? start.x + start.width) + moveX, 0, canvasWidth),
              y2: clamp((start.y2 ?? start.y) + moveY, 0, canvasHeight),
            };
          }
          return {
            ...item,
            x: clamp(start.x + moveX, 0, canvasWidth - start.width),
            y: clamp(start.y + moveY, 0, canvasHeight - start.height),
          };
        })
      );
      return;
    }
    if (isLineElement(element.type)) {
      const startX2 = drag.startX2 ?? drag.startX + drag.startWidth;
      const startY2 = drag.startY2 ?? drag.startY;
      if (drag.mode === "line-start") {
        const x = clamp(snap(drag.startX + dx, gridSize), 0, canvasWidth);
        const y = clamp(snap(drag.startY + dy, gridSize), 0, canvasHeight);
        patchElement(drag.id, {
          x,
          y,
          width: Math.max(gridSize, Math.round(Math.hypot(startX2 - x, startY2 - y))),
        });
        return;
      }
      if (drag.mode === "line-end") {
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

  function beginSelectionBox(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    setContextMenu(null);
    const point = canvasPoint(event);
    setSelectionBox({
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
      additive: event.ctrlKey || event.metaKey,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function endDrag() {
    if (selectionBox) {
      const box = normalizedBox(selectionBox);
      const width = box.right - box.left;
      const height = box.bottom - box.top;
      if (width < 4 && height < 4) {
        if (!selectionBox.additive) {
          selectOnly(null);
        }
      } else {
        const matchedIds = elements
          .filter((element) => boxesIntersect(box, elementBounds(element)))
          .map((element) => element.id);
        if (selectionBox.additive) {
          selectMany([...selectedIds, ...matchedIds], matchedIds[matchedIds.length - 1] ?? focusedId);
        } else {
          selectMany(matchedIds);
        }
      }
      setSelectionBox(null);
      return;
    }
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelp((value) => !value)}
              aria-label="Floor plan designer help"
              aria-expanded={showHelp}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C9A96E]/50 bg-white font-serif text-lg text-[#8B6914] transition-colors hover:bg-[#C9A96E]/10"
            >
              ?
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A96E]">Floor plan designer</p>
          </div>
          <p className="mt-1 max-w-2xl text-sm font-light leading-relaxed text-[#7A6E68]">
            Build a visual venue draft on a {gridSize}px snap grid. This does not change live attendee seat selection yet.
          </p>
          {showHelp ? (
            <div className="mt-3 max-w-2xl rounded-xl border border-[#EDE8E3] bg-white p-4 text-xs leading-relaxed text-[#5E5550] shadow-sm">
              <p className="font-semibold uppercase tracking-[0.14em] text-[#1C1714]">Quick help</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <p>Drag on empty canvas to select multiple components.</p>
                <p>Hold Ctrl and click components to add or remove them from selection.</p>
                <p>Drag one selected component to move the whole selected group.</p>
                <p>Right-click the canvas or a component for add, copy, paste, duplicate, and delete actions.</p>
                <p>Ctrl + scroll or Ctrl + +/-/0 changes canvas zoom.</p>
                <p>Resize handles edit one focused component at a time.</p>
              </div>
            </div>
          ) : null}
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
              Background
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setBackgroundColor(event.target.value)}
                className="h-6 w-9 rounded border border-[#EDE8E3] bg-white p-0.5"
                aria-label="Canvas background color"
              />
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
          onClick={() => {
            setContextMenu(null);
            setIsOpen(false);
          }}
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

        <div className="overflow-auto rounded-2xl border border-[#EDE8E3] bg-white p-4" onScroll={() => setContextMenu(null)}>
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
                backgroundColor,
                backgroundImage: showGrid
                  ? "linear-gradient(to right, rgba(201,169,110,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(201,169,110,.18) 1px, transparent 1px)"
                  : "none",
                backgroundSize: `${gridSize}px ${gridSize}px`,
              }}
              onPointerMove={updateDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerDown={beginSelectionBox}
              onContextMenu={(event) => openContextMenu(event)}
            >
            {elements.map((element) => {
              const selectedElement = selectedIdSet.has(element.id);
              if (isLineElement(element.type)) {
                const metrics = lineMetrics(element);
                const lineWidth = element.type === "window"
                  ? Math.max(6, Math.min(14, element.height || 8))
                  : Math.max(3, Math.min(12, element.height || 4));
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
                    onContextMenu={(event) => openContextMenu(event, element.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (event.ctrlKey || event.metaKey) {
                        return;
                      }
                      selectOnly(element.id);
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
                          element.type === "window"
                            ? `${lineWidth}px double ${element.color}`
                            : element.wallStyle === "dotted"
                            ? `${lineWidth}px dotted ${element.color}`
                            : element.wallStyle === "dashed"
                              ? `${lineWidth}px dashed ${element.color}`
                              : `${lineWidth}px solid ${element.color}`,
                      }}
                    />
                    {selectedElement ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Move ${element.type} start`}
                          className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab border border-[#1C1714] bg-[#C9A96E]"
                          onPointerDown={(event) => beginDrag(event, element, "line-start")}
                        />
                        <button
                          type="button"
                          aria-label={`Move ${element.type} end`}
                          className="absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-grab border border-[#1C1714] bg-[#C9A96E]"
                          onPointerDown={(event) => beginDrag(event, element, "line-end")}
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
                    backgroundColor: element.type === "text" || (isAccessElement(element.type) && doorStyle(element) !== "classic") ? "transparent" : element.color,
                    borderColor: outlineColor(element),
                    borderWidth: outlineWidth(element),
                    color: element.type === "text" ? element.color : "#1C1714",
                    transform: `rotate(${element.rotation}deg)`,
                    transformOrigin: "center",
                  }}
                  onPointerDown={(event) => beginDrag(event, element, "move")}
                  onContextMenu={(event) => openContextMenu(event, element.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (event.ctrlKey || event.metaKey) {
                      return;
                    }
                    selectOnly(element.id);
                  }}
                >
                  <div className="relative flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.08em]">
                    {element.type === "rowed_seats" ? <RowedSeatPreview element={element} /> : null}
                    {isAccessElement(element.type) ? <DoorPreview element={element} /> : null}
                    <span
                      className={element.type === "rowed_seats" || (isAccessElement(element.type) && doorStyle(element) !== "classic") ? "absolute -top-5 left-0 z-10 rounded bg-[#FDFAF4]/90 px-1.5 py-0.5 text-[10px]" : "relative z-10 break-words p-2"}
                      style={labelOrientationStyle(element)}
                    >
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
              {selectionBox ? (() => {
                const box = normalizedBox(selectionBox);
                return (
                  <div
                    className="pointer-events-none absolute z-40 border border-[#C9A96E] bg-[#C9A96E]/15"
                    style={{
                      left: box.left,
                      top: box.top,
                      width: box.right - box.left,
                      height: box.bottom - box.top,
                    }}
                  />
                );
              })() : null}
            </div>
          </div>
        </div>

        {contextMenu ? (
          <div
            className="fixed z-[70] w-64 overflow-hidden rounded-lg border border-[#EDE8E3] bg-white py-2 text-xs shadow-2xl"
            style={{
              left: contextMenu.screenX,
              top: contextMenu.screenY,
            }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            {contextMenu.targetId ? (
              <div className="border-b border-[#EDE8E3] px-2 pb-2">
                <button
                  type="button"
                  onClick={copySelected}
                  className="block w-full rounded px-3 py-2 text-left font-medium text-[#1C1714] hover:bg-[#C9A96E]/10"
                >
                  Copy component
                </button>
                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="block w-full rounded px-3 py-2 text-left font-medium text-[#1C1714] hover:bg-[#C9A96E]/10"
                >
                  Duplicate component
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="block w-full rounded px-3 py-2 text-left font-medium text-destructive hover:bg-destructive-muted"
                >
                  Delete component
                </button>
              </div>
            ) : null}
            <div className="border-b border-[#EDE8E3] px-2 py-2">
              <button
                type="button"
                onClick={() => pasteCopiedAt(contextMenu.canvasX, contextMenu.canvasY)}
                disabled={!copiedElement}
                className="block w-full rounded px-3 py-2 text-left font-medium text-[#1C1714] hover:bg-[#C9A96E]/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Paste here
              </button>
            </div>
            <div className="max-h-72 overflow-auto px-2 pt-2">
              {GROUPS.map((group) => (
                <div key={group} className="mb-2 last:mb-0">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A96E]">{group}</p>
                  {PALETTE.filter((item) => item.group === group).map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addElementAt(item, contextMenu.canvasX, contextMenu.canvasY)}
                      className="block w-full rounded px-3 py-2 text-left text-[#1C1714] hover:bg-[#C9A96E]/10"
                    >
                      Add {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <aside className="overflow-auto rounded-2xl border border-[#EDE8E3] bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C9A96E]">Properties</p>
              {selectedElements.length > 1 ? (
                <p className="mt-1 text-xs text-[#7A6E68]">{selectedElements.length} components selected</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={duplicateSelected} disabled={selectedElements.length === 0} className="rounded border border-[#EDE8E3] px-2 py-1 text-xs disabled:opacity-35">
                Duplicate
              </button>
              <button type="button" onClick={deleteSelected} disabled={selectedElements.length === 0} className="rounded border border-destructive/25 bg-destructive-muted px-2 py-1 text-xs text-destructive disabled:opacity-35">
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

              {!isLineElement(selected.type) ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Outline</span>
                    <input
                      type="color"
                      className="h-10 w-full rounded border border-[#EDE8E3] bg-white p-1"
                      value={outlineColor(selected)}
                      onChange={(e) => patchElement(selected.id, { outlineColor: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Outline width</span>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      className="input-eventuz"
                      value={outlineWidth(selected)}
                      onChange={(e) => patchElement(selected.id, { outlineWidth: clamp(Number(e.target.value), 0, 12) })}
                    />
                  </label>
                </div>
              ) : null}

              {!isLineElement(selected.type) ? (
                <label className="flex items-center justify-between gap-3 rounded border border-[#EDE8E3] bg-[#FDFAF4] px-3 py-2 text-xs text-[#1C1714]">
                  <span className="font-medium">Keep label horizontal</span>
                  <input
                    type="checkbox"
                    checked={selected.keepLabelHorizontal === true}
                    onChange={(e) => patchElement(selected.id, { keepLabelHorizontal: e.target.checked })}
                    className="h-4 w-4 accent-[#C9A96E]"
                  />
                </label>
              ) : null}

              {selected.type === "wall" ? (
                <div className="space-y-3">
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
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Wall thickness</span>
                    <input
                      type="number"
                      min={4}
                      max={12}
                      className="input-eventuz"
                      value={Math.max(4, Math.min(12, selected.height || 4))}
                      onChange={(e) => patchElement(selected.id, { height: clamp(Number(e.target.value), 4, 12) })}
                    />
                  </label>
                </div>
              ) : null}

              {isAccessElement(selected.type) ? (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Access design</span>
                  <select
                    className="input-eventuz"
                    value={selected.doorStyle ?? "classic"}
                    onChange={(e) =>
                      patchElement(selected.id, {
                        doorStyle: e.target.value as FloorPlanElement["doorStyle"],
                      })
                    }
                  >
                    <option value="classic">Classic block</option>
                    <option value="single">Single door</option>
                    <option value="double">Double doors</option>
                  </select>
                </label>
              ) : null}

              {isFloorPlanSeatElement(selected.type) ? (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Ticket group</span>
                  <select
                    className="input-eventuz"
                    value={selected.ticketTypeId ?? ""}
                    onChange={(e) => handleSeatTicketGroupChange(selected, e.target.value)}
                  >
                    <option value="">Choose ticket group</option>
                    {selectedTicketTypeOptions.map((ticketType) => (
                      <option key={ticketType.id} value={ticketType.id}>{ticketType.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {SEAT_TABLE_TYPES.has(selected.type) ? (
                <div className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Table shape</span>
                    <select
                      className="input-eventuz"
                      value={selected.type}
                      onChange={(e) =>
                        changeTableShape(
                          selected.id,
                          e.target.value as "circle_table" | "square_table" | "rectangle_table"
                        )
                      }
                    >
                      <option value="circle_table">Circle</option>
                      <option value="square_table">Square</option>
                      <option value="rectangle_table">Rectangle</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Ticket table</span>
                    <select
                      className="input-eventuz"
                      value={selected.ticketTableNumber ?? ""}
                      disabled={!selectedTicketType || selectedTicketType.seatLayoutMode !== "tables"}
                      onChange={(e) =>
                        handleTicketTableChange(
                          selected,
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    >
                      <option value="">
                        {selectedTicketType && selectedTicketType.seatLayoutMode === "tables"
                          ? "Choose ticket table"
                          : "Choose table ticket group first"}
                      </option>
                      {selectedTicketType && selectedTicketType.seatLayoutMode === "tables"
                        ? Array.from({ length: selectedTicketType.seatLayoutTableCount ?? 0 }).map((_, index) => {
                            const tableNumber = index + 1;
                            const usedByAnother = usedTableNumbers(selectedTicketType.id, selected.id).has(tableNumber);
                            return (
                              <option key={tableNumber} value={tableNumber} disabled={usedByAnother}>
                                T{tableNumber}{usedByAnother ? " (linked)" : ""}
                              </option>
                            );
                          })
                        : null}
                    </select>
                  </label>
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
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Seat size</span>
                    <input
                      type="number"
                      min={10}
                      max={32}
                      className="input-eventuz"
                      value={selected.tableSeatSize ?? 16}
                      onChange={(e) => patchElement(selected.id, { tableSeatSize: clamp(Number(e.target.value), 10, 32) })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded border border-[#EDE8E3] bg-[#FDFAF4] px-3 py-2 text-xs text-[#1C1714]">
                    <span className="font-medium">Show seat numbers</span>
                    <input
                      type="checkbox"
                      checked={selected.showTableSeatNumbers === true}
                      onChange={(e) => patchElement(selected.id, { showTableSeatNumbers: e.target.checked })}
                      className="h-4 w-4 accent-[#C9A96E]"
                    />
                  </label>
                </div>
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

              {isLineElement(selected.type) ? (
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
                    <input type="number" step={gridSize} className="input-eventuz" value={lineEnd(selected).x2} onChange={(e) => patchElement(selected.id, { x2: clamp(snap(Number(e.target.value), gridSize), 0, canvasWidth) })} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">End Y</span>
                    <input type="number" step={gridSize} className="input-eventuz" value={lineEnd(selected).y2} onChange={(e) => patchElement(selected.id, { y2: clamp(snap(Number(e.target.value), gridSize), 0, canvasHeight) })} />
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
