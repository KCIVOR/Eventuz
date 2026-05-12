import React from "react";
import { formatPhp } from "@/lib/utils/money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ListPagination } from "@/components/ui/ListPagination";
import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/ui/pagination";

type OrderRow = {
  id: string;
  created_at: string;
  buyer_label: string;
  buyer_email: string | null;
  ticket_type_name: string;
  quantity: number;
  total_amount: number;
  status: string;
  latest_payment: {
    status: string;
    amount: number;
  } | null;
};

type Props = {
  orders: OrderRow[];
  pageData: {
    slice: OrderRow[];
    page: number;
    total: number;
    pageCount: number;
    rangeStart: number;
    rangeEnd: number;
  };
  dashPath: string;
  searchParams: SerializableSearchParams;
  paramKey: string;
};

export function DashboardOrdersTable({ orders: _orders, pageData, dashPath, searchParams, paramKey }: Props) {
  return (
    <ScrollableTableWrapper>
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Buyer</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Payment</th>
          </tr>
        </thead>
        <tbody>
          {pageData.slice.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                No orders yet.
              </td>
            </tr>
          ) : (
            pageData.slice.map((o) => (
              <tr key={o.id} className="border-b border-border/80 last:border-b-0">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{o.buyer_label}</p>
                  {o.buyer_email ? (
                    <p className="text-xs text-muted-foreground">{o.buyer_email}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{o.ticket_type_name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{o.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPhp(o.total_amount)}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {o.id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} type="order" />
                </td>
                <td className="px-4 py-3 text-xs">
                  {o.latest_payment ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.latest_payment.status} type="payment" />
                      <span className="text-muted-foreground">
                        {formatPhp(o.latest_payment.amount)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {pageData.total > 0 ? (
        <ListPagination
          pathname={dashPath}
          searchParams={searchParams}
          paramKey={paramKey}
          page={pageData.page}
          pageSize={DEFAULT_LIST_PAGE_SIZE}
          total={pageData.total}
          pageCount={pageData.pageCount}
          rangeStart={pageData.rangeStart}
          rangeEnd={pageData.rangeEnd}
          listLabel="All orders"
        />
      ) : null}
    </ScrollableTableWrapper>
  );
}
