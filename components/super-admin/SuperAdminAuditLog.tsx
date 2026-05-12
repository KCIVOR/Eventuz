import React from "react";
import { ListPagination } from "@/components/ui/ListPagination";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";

type AuditLogRow = {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
};

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
};

export function SuperAdminAuditLog({ auditRows, pageData, pathname, searchParams }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/90 bg-card shadow-[0_2px_12px_rgba(28,25,23,0.05)]">
      <table className="min-w-[720px] w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/25 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Actor</th>
          </tr>
        </thead>
        <tbody>
          {pageData.slice.map((row) => (
            <tr key={row.id} className="border-b border-border/70 last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                {fmtAuditTime(row.created_at)}
              </td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-foreground">{row.action}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {row.entity_type}
                {row.entity_id ? (
                  <>
                    <span className="text-border"> · </span>
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
        <p className="border-t border-border p-6 text-center text-muted-foreground">No audit entries yet.</p>
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
  );
}

function shortId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
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
