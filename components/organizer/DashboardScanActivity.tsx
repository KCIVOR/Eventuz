import React from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ListPagination } from "@/components/ui/ListPagination";
import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/ui/pagination";

type ScanRow = {
  scanned_at: string;
  scan_result: string;
  ticket_code: string | null;
  attendee_name: string | null;
};

type Props = {
  scans: ScanRow[];
  pageData: {
    slice: ScanRow[];
    page: number;
    total: number;
    pageCount: number;
    rangeStart: number;
    rangeEnd: number;
  };
  dashPath: string;
  searchParams: SerializableSearchParams;
};

export function DashboardScanActivity({ scans: _scans, pageData, dashPath, searchParams }: Props) {
  return (
    <ScrollableTableWrapper
      footer={pageData.total > 0 ? (
        <ListPagination
          pathname={dashPath}
          searchParams={searchParams}
          paramKey="db_s"
          page={pageData.page}
          pageSize={DEFAULT_LIST_PAGE_SIZE}
          total={pageData.total}
          pageCount={pageData.pageCount}
          rangeStart={pageData.rangeStart}
          rangeEnd={pageData.rangeEnd}
          listLabel="Recent scan activity"
        />
      ) : null}
    >
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Result</th>
            <th className="px-4 py-3">Ticket</th>
            <th className="px-4 py-3">Guest</th>
          </tr>
        </thead>
        <tbody>
          {pageData.slice.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                No scans recorded yet.
              </td>
            </tr>
          ) : (
            pageData.slice.map((r, i) => (
              <tr key={`${r.scanned_at}-${i}`} className="border-b border-border/80 last:border-b-0">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {new Date(r.scanned_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.scan_result} type="scan" />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {r.ticket_code ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.attendee_name ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ScrollableTableWrapper>
  );
}
