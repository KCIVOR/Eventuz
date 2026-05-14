import type { AuditLogRow } from "@/lib/super-admin/loadRecentAuditLogs";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";

export type AuditSortKey = "created_at" | "action" | "entity_type" | "actor_user_id";
export type AuditSortDir = "asc" | "desc";

export type AuditLogFilterState = {
  search: string;
  action: string;
  entityType: string;
  actor: string;
  dateFrom: string;
  dateTo: string;
  sort: AuditSortKey;
  dir: AuditSortDir;
};

export type AuditLogFilterOptions = {
  actions: string[];
  entityTypes: string[];
  actors: { value: string; label: string }[];
};

export function parseAuditLogFilters(q: SerializableSearchParams): AuditLogFilterState {
  const sortRaw = firstParam(q.au_sort);
  const dirRaw = firstParam(q.au_dir);

  return {
    search: firstParam(q.au_q).trim(),
    action: firstParam(q.au_action).trim(),
    entityType: firstParam(q.au_entity).trim(),
    actor: firstParam(q.au_actor).trim(),
    dateFrom: normalizeDateParam(firstParam(q.au_from)),
    dateTo: normalizeDateParam(firstParam(q.au_to)),
    sort: isAuditSortKey(sortRaw) ? sortRaw : "created_at",
    dir: dirRaw === "asc" ? "asc" : "desc",
  };
}

export function getAuditLogFilterOptions(rows: AuditLogRow[]): AuditLogFilterOptions {
  const actions = uniqueSorted(rows.map((row) => row.action).filter(Boolean));
  const entityTypes = uniqueSorted(rows.map((row) => row.entity_type).filter(Boolean));
  const actorIds = uniqueSorted(rows.map((row) => row.actor_user_id).filter(Boolean) as string[]);
  const hasSystem = rows.some((row) => !row.actor_user_id);

  return {
    actions,
    entityTypes,
    actors: [
      ...(hasSystem ? [{ value: "system", label: "System" }] : []),
      ...actorIds.map((id) => ({ value: id, label: shortId(id) })),
    ],
  };
}

export function filterAndSortAuditLogs(
  rows: AuditLogRow[],
  filters: AuditLogFilterState
): AuditLogRow[] {
  const search = filters.search.toLowerCase();
  const fromTime = dateStartTime(filters.dateFrom);
  const toTime = dateEndTime(filters.dateTo);

  const filtered = rows.filter((row) => {
    const rowTime = Date.parse(row.created_at);
    if (fromTime !== null && (Number.isNaN(rowTime) || rowTime < fromTime)) return false;
    if (toTime !== null && (Number.isNaN(rowTime) || rowTime > toTime)) return false;
    if (filters.action && row.action !== filters.action) return false;
    if (filters.entityType && row.entity_type !== filters.entityType) return false;
    if (filters.actor === "system" && row.actor_user_id) return false;
    if (filters.actor && filters.actor !== "system" && row.actor_user_id !== filters.actor) {
      return false;
    }

    if (search) {
      const haystack = [
        row.created_at,
        row.action,
        row.entity_type,
        row.entity_id,
        row.actor_user_id ?? "system",
        JSON.stringify(row.metadata ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => compareAuditRows(a, b, filters.sort, filters.dir));
}

export function hasAuditFilters(filters: AuditLogFilterState): boolean {
  return Boolean(
    filters.search ||
      filters.action ||
      filters.entityType ||
      filters.actor ||
      filters.dateFrom ||
      filters.dateTo
  );
}

function compareAuditRows(
  a: AuditLogRow,
  b: AuditLogRow,
  sort: AuditSortKey,
  dir: AuditSortDir
): number {
  const direction = dir === "asc" ? 1 : -1;
  const av = valueForSort(a, sort);
  const bv = valueForSort(b, sort);
  const compared = av.localeCompare(bv, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (compared !== 0) return compared * direction;
  return b.created_at.localeCompare(a.created_at);
}

function valueForSort(row: AuditLogRow, sort: AuditSortKey): string {
  if (sort === "actor_user_id") return row.actor_user_id ?? "system";
  return String(row[sort] ?? "");
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeDateParam(value: string): string {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function dateStartTime(value: string): number | null {
  if (!value) return null;
  const time = Date.parse(`${value}T00:00:00`);
  return Number.isNaN(time) ? null : time;
}

function dateEndTime(value: string): number | null {
  if (!value) return null;
  const time = Date.parse(`${value}T23:59:59.999`);
  return Number.isNaN(time) ? null : time;
}

function isAuditSortKey(value: string): value is AuditSortKey {
  return (
    value === "created_at" ||
    value === "action" ||
    value === "entity_type" ||
    value === "actor_user_id"
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

function shortId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...`;
}
