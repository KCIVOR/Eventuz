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
  mode: "move" | "resize";
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
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
  { type: "wall", label: "Wall", group: "Structure", width: 160, height: 20, color: "#1C1714" },
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

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `fp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function snap(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
        const rx = element.width / 2 + 10;
        const ry = element.height / 2 + 10;
        return (
          <span
            key={index}
            className="absolute h-3 w-3 rounded-full border border-[#1C1714]/20 bg-[#FDFAF4]"
            style={{
              left: element.width / 2 + Math.cos(angle) * rx - 6,
              top: element.height / 2 + Math.sin(angle) * ry - 6,
            }}
          />
        );
      })}
    </>
  );
}

function RowedSeatPreview({ element }: { element: FloorPlanElement }) {
  if (element.type !== "rowed_seats") return null;
  const rows = Math.min(element.rows ?? 1, 10);
  const columns = Math.min(element.columns ?? 1, 12);
  return (
    <div
      className="grid h-full w-full gap-1 p-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows * columns }).map((_, index) => (
        <span key={index} className="rounded-sm border border-[#1C1714]/15 bg-[#FDFAF4]/75" />
      ))}
    </div>
  );
}

export function OrganizerFloorPlanDesigner({
  eventId,
  ticketTypes,
  initialLayout,
  canvasWidth = FLOOR_PLAN_CANVAS_WIDTH,
  canvasHeight = FLOOR_PLAN_CANVAS_HEIGHT,
  gridSize = FLOOR_PLAN_GRID_SIZE,
}: Props) {
  const [elements, setElements] = useState<FloorPlanElement[]>(() => normalizeInitialLayout(initialLayout));
  const [selectedId, setSelectedId] = useState<string | null>(elements[0]?.id ?? null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isOpen, setIsOpen] = useState(true);
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

  function addElement(item: PaletteItem) {
    const next: FloorPlanElement = {
      id: uid(),
      type: item.type,
      x: snap(80 + elements.length * 20, gridSize),
      y: snap(80 + elements.length * 20, gridSize),
      width: item.width,
      height: item.height,
      rotation: 0,
      label: item.label,
      color: item.color,
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
        imported.push({
          id: uid(),
          type: "rowed_seats",
          x: snap(60 + (index % 3) * 280, gridSize),
          y: snap(60 + Math.floor(index / 3) * 180, gridSize),
          width: clamp(snap(ticketType.seatLayoutColumns * 28, gridSize), 160, 520),
          height: clamp(snap(ticketType.seatLayoutRows * 24, gridSize), 100, 420),
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

  function duplicateSelected() {
    if (!selected) return;
    const next = {
      ...selected,
      id: uid(),
      x: clamp(selected.x + gridSize * 2, 0, canvasWidth - selected.width),
      y: clamp(selected.y + gridSize * 2, 0, canvasHeight - selected.height),
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
      startWidth: element.width,
      startHeight: element.height,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;
    const element = elements.find((item) => item.id === drag.id);
    if (!element) return;
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

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#EDE8E3] bg-[#FDFAF4] p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9A96E]">Floor plan designer</p>
          <p className="mt-1 max-w-2xl text-sm font-light leading-relaxed text-[#7A6E68]">
            Build a visual venue draft on a {gridSize}px snap grid. This does not change live attendee seat selection yet.
          </p>
          <button
            type="button"
            onClick={importTicketGroupSeats}
            className="mt-3 rounded-sm border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6914] transition-colors hover:bg-[#C9A96E]/20"
          >
            Import ticket group seats
          </button>
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
            ref={canvasRef}
            className="relative mx-auto overflow-hidden border border-[#D9D2CA] bg-[#FDFAF4]"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              backgroundImage:
                "linear-gradient(to right, rgba(201,169,110,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(201,169,110,.18) 1px, transparent 1px)",
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
            onPointerMove={updateDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={() => setSelectedId(null)}
          >
            {elements.map((element) => {
              const selectedElement = selectedId === element.id;
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
                  <div className="relative flex h-full w-full items-center justify-center p-2 text-xs font-semibold uppercase tracking-[0.08em]">
                    {element.type === "rowed_seats" ? <RowedSeatPreview element={element} /> : null}
                    <span className={element.type === "rowed_seats" ? "absolute left-2 top-2 z-10 rounded bg-[#FDFAF4]/85 px-2 py-1 text-[10px]" : "relative z-10 break-words"}>
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
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Rows</span>
                    <input type="number" min={1} max={100} className="input-eventuz" value={selected.rows ?? 1} onChange={(e) => patchElement(selected.id, { rows: clamp(Number(e.target.value), 1, 100) })} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6E68]">Columns</span>
                    <input type="number" min={1} max={100} className="input-eventuz" value={selected.columns ?? 1} onChange={(e) => patchElement(selected.id, { columns: clamp(Number(e.target.value), 1, 100) })} />
                  </label>
                </div>
              ) : null}

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
