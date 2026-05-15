"use client";

import React from "react";
import Link from "next/link";
import { formatPhp } from "@/lib/utils/money";
import { ListPagination } from "@/components/ui/ListPagination";
import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/ui/pagination";
import type { TransactionRow, TransactionFilterState } from "@/lib/attendee/transactions";

type Props = {
  transactions: TransactionRow[];
  total: number;
  page: number;
  filterState: TransactionFilterState;
  pathname: string;
};

export function AttendeeTransactionHistory({
  transactions,
  total,
  page,
  filterState,
  pathname,
}: Props) {
  const pageCount = Math.ceil(total / DEFAULT_LIST_PAGE_SIZE);
  const rangeStart = (page - 1) * DEFAULT_LIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * DEFAULT_LIST_PAGE_SIZE, total);

  return (
    <div className="space-y-10">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end justify-between border-b border-border/50 pb-8">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-gold font-semibold">History</p>
          <h1 className="font-serif text-4xl text-foreground">Transactions</h1>
        </div>

        <form action={pathname} className="flex items-center gap-3">
          <div className="min-w-[180px]">
            <select
              name="status"
              defaultValue={filterState.status}
              className="input-eventuz py-2.5 text-[11px] uppercase tracking-wider"
              onChange={(e) => e.target.form?.requestSubmit()}
            >
              <option value="">All Statuses</option>
              <option value="paid_unassigned">Paid (Unassigned)</option>
              <option value="completed">Completed</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
              <option value="payment_failed">Payment Failed</option>
            </select>
          </div>
          <button type="submit" className="btn-eventuz-primary px-6 py-2.5 text-[10px]">
            Apply
          </button>
        </form>
      </div>

      {/* Table Container - Using ScrollableTableWrapper to fix persistent pagination */}
      <ScrollableTableWrapper
        footer={total > DEFAULT_LIST_PAGE_SIZE ? (
          <div className="p-6">
            <ListPagination
              pathname={pathname}
              searchParams={{ status: filterState.status }}
              paramKey="page"
              page={page}
              pageSize={DEFAULT_LIST_PAGE_SIZE}
              total={total}
              pageCount={pageCount}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              listLabel="Transactions"
            />
          </div>
        ) : null}
      >
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-accent-gold/[0.03] text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-gold">
              <th className="px-6 py-5">Date</th>
              <th className="px-6 py-5">Event & Package</th>
              <th className="px-6 py-5">Amount</th>
              <th className="px-6 py-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {transactions.map((row) => (
              <tr key={row.id} className="group transition-colors hover:bg-accent-gold/[0.01]">
                <td className="px-6 py-6 whitespace-nowrap">
                  <p className="text-xs text-foreground font-medium">{new Date(row.created_at).toLocaleDateString()}</p>
                  <p className="text-[10px] text-muted-foreground font-light uppercase mt-1">{new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </td>
                <td className="px-6 py-6">
                  <p className="text-sm font-medium text-foreground uppercase tracking-tight">{row.event_name}</p>
                  <p className="text-[11px] text-muted-foreground font-light italic mt-1">
                    {row.ticket_type_name} &times; {row.quantity}
                  </p>
                </td>
                <td className="px-6 py-6">
                  <p className="text-lg font-serif text-foreground">{formatPhp(row.total_amount)}</p>
                  <p className="text-[9px] uppercase tracking-widest text-accent-gold mt-0.5">{row.pricing_type.replace('_', ' ')}</p>
                </td>
                <td className="px-6 py-6">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="py-24 text-center">
            <div className="h-1 w-1 bg-accent-gold rotate-45 mx-auto mb-4 opacity-40" />
            <p className="text-xs text-muted-foreground font-light italic tracking-wide">No transactions found matching your criteria.</p>
          </div>
        )}
      </ScrollableTableWrapper>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "a-success",
    paid_unassigned: "a-success",
    partially_assigned: "a-info",
    payment_pending: "a-info",
    cancelled: "a-error",
    expired: "a-warning",
    payment_failed: "a-error",
    capacity_held: "a-info",
  };

  const labels: Record<string, string> = {
    completed: "Completed",
    paid_unassigned: "Paid (Unassigned)",
    partially_assigned: "Partially Assigned",
    payment_pending: "Payment Pending",
    cancelled: "Cancelled",
    expired: "Expired",
    payment_failed: "Payment Failed",
    capacity_held: "Held",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-sm text-[9px] font-semibold uppercase tracking-widest ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {labels[status] || status.replace('_', ' ')}
    </span>
  );
}
