export const FLOOR_PLAN_CANVAS_WIDTH = 1800;
export const FLOOR_PLAN_CANVAS_HEIGHT = 1200;
export const FLOOR_PLAN_GRID_SIZE = 20;
export const FLOOR_PLAN_BACKGROUND_COLOR = "#FDFAF4";

export const FLOOR_PLAN_ELEMENT_TYPES = [
  "wall",
  "window",
  "door",
  "exit",
  "entrance",
  "stage",
  "screen",
  "barrier",
  "circle_table",
  "square_table",
  "rectangle_table",
  "rowed_seats",
  "food_table",
  "bar",
  "stall",
  "text",
] as const;

export type FloorPlanElementType = (typeof FLOOR_PLAN_ELEMENT_TYPES)[number];

export type FloorPlanElement = {
  id: string;
  type: FloorPlanElementType;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  color: string;
  outlineColor?: string;
  outlineWidth?: number;
  keepLabelHorizontal?: boolean;
  wallStyle?: "solid" | "dashed" | "dotted";
  doorStyle?: "classic" | "single" | "double";
  ticketTypeId?: string;
  seatsPerTable?: number;
  tableSeatSize?: number;
  showTableSeatNumbers?: boolean;
  rows?: number;
  columns?: number;
  source?: "manual" | "ticket_import";
};

export type FloorPlanLayout = {
  elements: FloorPlanElement[];
  backgroundColor?: string;
};

export type FloorPlanTicketType = {
  id: string;
  name: string;
  quantity: number;
  seatLayoutMode: "rowed" | "tables";
  seatLayoutRows: number | null;
  seatLayoutColumns: number | null;
  seatLayoutTableCount: number | null;
  seatLayoutSeatsPerTable: number | null;
};

export type FloorPlanValidationResult =
  | { ok: true; layout: FloorPlanLayout; allocations: Record<string, number> }
  | { ok: false; message: string };

export type FloorPlanValidationOptions = {
  strictAllocation?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
};

const ELEMENT_TYPE_SET = new Set<string>(FLOOR_PLAN_ELEMENT_TYPES);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const TABLE_TYPES = new Set<FloorPlanElementType>([
  "circle_table",
  "square_table",
  "rectangle_table",
]);

export function isFloorPlanSeatElement(type: FloorPlanElementType): boolean {
  return TABLE_TYPES.has(type) || type === "rowed_seats";
}

export function floorPlanSeatCount(element: FloorPlanElement): number {
  if (TABLE_TYPES.has(element.type)) {
    return element.seatsPerTable ?? 0;
  }
  if (element.type === "rowed_seats") {
    return (element.rows ?? 0) * (element.columns ?? 0);
  }
  return 0;
}

function intInRange(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampToGrid(value: unknown, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const snapped = Math.round(n / FLOOR_PLAN_GRID_SIZE) * FLOOR_PLAN_GRID_SIZE;
  return Math.min(max, Math.max(0, snapped));
}

export function validateFloorPlanLayout(
  raw: unknown,
  ticketTypes: FloorPlanTicketType[],
  options: FloorPlanValidationOptions = {}
): FloorPlanValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, message: "Floor plan payload is invalid." };
  }

  const rawElements = (raw as { elements?: unknown }).elements;
  if (!Array.isArray(rawElements)) {
    return { ok: false, message: "Floor plan elements are invalid." };
  }
  if (rawElements.length > 300) {
    return { ok: false, message: "Floor plan has too many components." };
  }

  const canvasWidth = options.canvasWidth ?? FLOOR_PLAN_CANVAS_WIDTH;
  const canvasHeight = options.canvasHeight ?? FLOOR_PLAN_CANVAS_HEIGHT;
  const backgroundColorRaw = String((raw as { backgroundColor?: unknown }).backgroundColor ?? "");
  const backgroundColor = HEX_COLOR_RE.test(backgroundColorRaw)
    ? backgroundColorRaw
    : FLOOR_PLAN_BACKGROUND_COLOR;
  const ticketTypeIds = new Set(ticketTypes.map((t) => t.id));
  const allocations: Record<string, number> = Object.fromEntries(
    ticketTypes.map((t) => [t.id, 0])
  );
  const elements: FloorPlanElement[] = [];

  for (const rawElement of rawElements) {
    if (!rawElement || typeof rawElement !== "object") {
      return { ok: false, message: "Every floor plan component must be valid." };
    }
    const e = rawElement as Record<string, unknown>;
    const type = String(e.type ?? "");
    if (!ELEMENT_TYPE_SET.has(type)) {
      return { ok: false, message: "Floor plan contains an unsupported component." };
    }

    const elementType = type as FloorPlanElementType;
    const width = clampToGrid(e.width, canvasWidth);
    const height = clampToGrid(e.height, canvasHeight);
    const x = clampToGrid(e.x, canvasWidth);
    const y = clampToGrid(e.y, canvasHeight);
    const element: FloorPlanElement = {
      id: String(e.id ?? "").trim().slice(0, 80) || crypto.randomUUID(),
      type: elementType,
      x,
      y,
      width: Math.max(FLOOR_PLAN_GRID_SIZE, width),
      height: Math.max(FLOOR_PLAN_GRID_SIZE, height),
      rotation: intInRange(e.rotation, -180, 180, 0),
      label: String(e.label ?? "").trim().slice(0, 80),
      color: HEX_COLOR_RE.test(String(e.color ?? "")) ? String(e.color) : "#C9A96E",
      outlineColor: HEX_COLOR_RE.test(String(e.outlineColor ?? "")) ? String(e.outlineColor) : "#1C1714",
      outlineWidth: intInRange(e.outlineWidth, 0, 12, 1),
      keepLabelHorizontal: e.keepLabelHorizontal === true,
      source: e.source === "ticket_import" ? "ticket_import" : "manual",
    };

    if (elementType === "wall" || elementType === "window") {
      element.x2 = clampToGrid(e.x2 ?? x + element.width, canvasWidth);
      element.y2 = clampToGrid(e.y2 ?? y, canvasHeight);
      element.height =
        elementType === "window"
          ? Math.max(6, Math.min(14, intInRange(e.height, 6, 14, 8)))
          : Math.max(4, Math.min(12, intInRange(e.height, 4, 12, 4)));
    }

    if (elementType === "wall") {
      element.wallStyle =
        e.wallStyle === "dashed" || e.wallStyle === "dotted" || e.wallStyle === "solid"
          ? e.wallStyle
          : "solid";
    }

    if (elementType === "door" || elementType === "entrance" || elementType === "exit") {
      element.doorStyle =
        e.doorStyle === "single" || e.doorStyle === "double" || e.doorStyle === "classic"
          ? e.doorStyle
          : "classic";
    }

    if (isFloorPlanSeatElement(elementType)) {
      const ticketTypeId = String(e.ticketTypeId ?? "").trim();
      if (ticketTypeId) {
        if (!ticketTypeIds.has(ticketTypeId)) {
          return { ok: false, message: "A seat component uses an invalid ticket group." };
        }
        element.ticketTypeId = ticketTypeId;
      }
      if (TABLE_TYPES.has(elementType)) {
        element.seatsPerTable = intInRange(e.seatsPerTable, 1, 12, 8);
        element.tableSeatSize = intInRange(e.tableSeatSize, 10, 32, 16);
        element.showTableSeatNumbers = e.showTableSeatNumbers === true;
      } else {
        element.rows = intInRange(e.rows, 1, 100, 1);
        element.columns = intInRange(e.columns, 1, 100, 1);
      }
      if (element.ticketTypeId) {
        allocations[element.ticketTypeId] += floorPlanSeatCount(element);
      }
    }

    elements.push(element);
  }

  if (options.strictAllocation) {
    for (const ticketType of ticketTypes) {
      const allocated = allocations[ticketType.id] ?? 0;
      if (allocated !== ticketType.quantity) {
        return {
          ok: false,
          message: `${ticketType.name} needs ${ticketType.quantity} seat(s), but the floor plan allocates ${allocated}.`,
        };
      }
    }
  }

  return { ok: true, layout: { elements, backgroundColor }, allocations };
}
