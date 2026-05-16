import React from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ListPagination } from "@/components/ui/ListPagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/ui/pagination";

import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";

type TicketRow = {
  id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_code: string;
  ticket_type_name: string;
  status: string;
  checked_in_at: string | null;
};

type Props = {
  tickets: TicketRow[];
  pageData: {
    slice: TicketRow[];
    page: number;
    total: number;
    pageCount: number;
    rangeStart: number;
    rangeEnd: number;
  };
  dashPath: string;
  searchParams: SerializableSearchParams;
  withoutPagination?: boolean;
};

export function DashboardTicketsTable({ tickets: _tickets, pageData, dashPath, searchParams, withoutPagination }: Props) {
  return (
    <ScrollableTableWrapper
      footer={!withoutPagination && pageData.total > 0 ? (
        <ListPagination
          pathname={dashPath}
          searchParams={searchParams}
          paramKey="db_t"
          page={pageData.page}
          pageSize={DEFAULT_LIST_PAGE_SIZE}
          total={pageData.total}
          pageCount={pageData.pageCount}
          rangeStart={pageData.rangeStart}
          rangeEnd={pageData.rangeEnd}
          listLabel="Attendee registry"
        />
      ) : null}
    >
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Guest</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Checked In</th>
          </tr>
        </thead>
        <tbody>
          {pageData.slice.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                No tickets issued yet.
              </td>
            </tr>
          ) : (
            pageData.slice.map((t) => (
              <tr key={t.id} className="border-b border-border/80 last:border-b-0">
                <td className="px-4 py-3 font-medium text-foreground">{t.attendee_name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.attendee_email}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground uppercase">
                  {t.ticket_code}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.ticket_type_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} type="ticket" />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {t.checked_in_at ? new Date(t.checked_in_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ScrollableTableWrapper>
  );
}
