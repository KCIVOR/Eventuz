import React from "react";
import Link from "next/link";
import { ListPagination } from "@/components/ui/ListPagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/ui/pagination";
import type {
  AuditLogFilterOptions,
  AuditLogFilterState,
  AuditSortKey,
} from "@/lib/super-admin/auditLogFilters";
import { hasAuditFilters } from "@/lib/super-admin/auditLogFilters";
import type { AuditLogRow } from "@/lib/super-admin/loadRecentAuditLogs";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";

type Props = {
  auditRows: AuditLogRow[];
  pageData: {
    slice: AuditLogRow[];
    page: number;
    total: number;
    pageCount: number;
    rangeStart: number;
    rangeEnd: number;
  };
  pathname: string;
  searchParams: SerializableSearchParams;
  filterState?: AuditLogFilterState;
  filterOptions?: AuditLogFilterOptions;
  showControls?: boolean;
};

const defaultFilters: AuditLogFilterState = {
  search: "",
  action: "",
  entityType: "",
  actor: "",
  dateFrom: "",
  dateTo: "",
  sort: "created_at",
  dir: "desc",
};

const defaultOptions: AuditLogFilterOptions = {
  actions: [],
  entityTypes: [],
  actors: [],
};

export function SuperAdminAuditLog({
  auditRows,
  pageData,
  pathname,
  searchParams,
  filterState = defaultFilters,
  filterOptions = defaultOptions,
  showControls = false,
}: Props) {
  const filtersActive = hasAuditFilters(filterState);

  return (
    <div className="space-y-4">
      {showControls ? (
        <AuditLogControls
          filters={filterState}
          options={filterOptions}
          pathname={pathname}
          filteredCount={auditRows.length}
          filtersActive={filtersActive}
        />
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border/90 bg-card shadow-[0_2px_12px_rgba(28,25,23,0.05)]">
        <table className="w-full min-w-[840px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/25 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <SortableHead
                label="Time"
                sortKey="created_at"
                pathname={pathname}
                searchParams={searchParams}
                filters={filterState}
              />
              <SortableHead
                label="Action"
                sortKey="action"
                pathname={pathname}
                searchParams={searchParams}
                filters={filterState}
              />
              <SortableHead
                label="Entity"
                sortKey="entity_type"
                pathname={pathname}
                searchParams={searchParams}
                filters={filterState}
              />
              <SortableHead
                label="Actor"
                sortKey="actor_user_id"
                pathname={pathname}
                searchParams={searchParams}
                filters={filterState}
              />
            </tr>
          </thead>
          <tbody>
            {pageData.slice.map((row) => (
              <tr key={row.id} className="border-b border-border/70 last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                  {fmtAuditTime(row.created_at)}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-foreground">
                  {row.action}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {row.entity_type}
                  {row.entity_id ? (
                    <>
                      <span className="text-border"> - </span>
                      <span className="font-mono text-foreground">{shortId(row.entity_id)}</span>
                    </>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {row.actor_user_id ? (
                    <span className="font-mono text-foreground">{shortId(row.actor_user_id)}</span>
                  ) : (
                    <span className="italic">system</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!auditRows.length ? (
          <p className="border-t border-border p-6 text-center text-muted-foreground">
            {filtersActive ? "No audit entries match your filters." : "No audit entries yet."}
          </p>
        ) : null}
        {auditRows.length > 0 ? (
          <ListPagination
            pathname={pathname}
            searchParams={searchParams}
            paramKey="lp_au"
            page={pageData.page}
            pageSize={DEFAULT_LIST_PAGE_SIZE}
            total={pageData.total}
            pageCount={pageData.pageCount}
            rangeStart={pageData.rangeStart}
            rangeEnd={pageData.rangeEnd}
            listLabel="Audit log"
          />
        ) : null}
      </div>
    </div>
  );
}

function AuditLogControls({
  filters,
  options,
  pathname,
  filteredCount,
  filtersActive,
}: {
  filters: AuditLogFilterState;
  options: AuditLogFilterOptions;
  pathname: string;
  filteredCount: number;
  filtersActive: boolean;
}) {
  return (
    <form
      action={pathname}
      className="rounded-2xl border border-border/90 bg-card p-4 shadow-[0_2px_12px_rgba(28,25,23,0.05)]"
    >
      <input type="hidden" name="au_sort" value={filters.sort} />
      <input type="hidden" name="au_dir" value={filters.dir} />
      <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_12rem_12rem_12rem_auto] lg:items-end">
        <div className="space-y-1.5">
          <label htmlFor="audit-search" className="label-eventuz">
            Search
          </label>
          <input
            id="audit-search"
            name="au_q"
            type="search"
            defaultValue={filters.search}
            placeholder="Action, entity, actor, metadata..."
            className="input-eventuz"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-action" className="label-eventuz">
            Action
          </label>
          <select
            id="audit-action"
            name="au_action"
            defaultValue={filters.action}
            className="input-eventuz"
          >
            <option value="">All actions</option>
            {options.actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-entity" className="label-eventuz">
            Entity
          </label>
          <select
            id="audit-entity"
            name="au_entity"
            defaultValue={filters.entityType}
            className="input-eventuz"
          >
            <option value="">All entities</option>
            {options.entityTypes.map((entityType) => (
              <option key={entityType} value={entityType}>
                {entityType}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-actor" className="label-eventuz">
            Actor
          </label>
          <select
            id="audit-actor"
            name="au_actor"
            defaultValue={filters.actor}
            className="input-eventuz"
          >
            <option value="">All actors</option>
            {options.actors.map((actor) => (
              <option key={actor.value} value={actor.value}>
                {actor.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-eventuz-primary px-4 py-2.5 text-xs">
            Apply
          </button>
          {filtersActive ? (
            <Link href={pathname} className="btn-eventuz-secondary px-4 py-2.5 text-xs">
              Reset
            </Link>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-[24.75rem]">
        <div className="space-y-1.5">
          <label htmlFor="audit-from" className="label-eventuz">
            From date
          </label>
          <input
            id="audit-from"
            name="au_from"
            type="date"
            defaultValue={filters.dateFrom}
            className="input-eventuz"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-to" className="label-eventuz">
            To date
          </label>
          <input
            id="audit-to"
            name="au_to"
            type="date"
            defaultValue={filters.dateTo}
            className="input-eventuz"
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Showing {filteredCount} matching audit {filteredCount === 1 ? "entry" : "entries"}.
      </p>
    </form>
  );
}

function SortableHead({
  label,
  sortKey,
  pathname,
  searchParams,
  filters,
}: {
  label: string;
  sortKey: AuditSortKey;
  pathname: string;
  searchParams: SerializableSearchParams;
  filters: AuditLogFilterState;
}) {
  const active = filters.sort === sortKey;
  const nextDir = active && filters.dir === "desc" ? "asc" : "desc";
  const indicator = active ? (filters.dir === "desc" ? " ↓" : " ↑") : "";

  return (
    <th className="px-4 py-3" scope="col">
      <Link
        href={hrefWithAuditSort(pathname, searchParams, sortKey, nextDir)}
        className="inline-flex items-center hover:text-foreground"
        prefetch={false}
      >
        {label}
        <span aria-hidden="true">{indicator}</span>
      </Link>
    </th>
  );
}

function hrefWithAuditSort(
  pathname: string,
  current: SerializableSearchParams,
  sortKey: AuditSortKey,
  dir: "asc" | "desc"
): string {
  const sp = new URLSearchParams();
  for (const [key, val] of Object.entries(current)) {
    if (key === "lp_au" || key === "au_sort" || key === "au_dir") continue;
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => sp.append(key, v));
    } else {
      sp.set(key, val);
    }
  }
  sp.set("au_sort", sortKey);
  sp.set("au_dir", dir);
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function shortId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...`;
}

function fmtAuditTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
