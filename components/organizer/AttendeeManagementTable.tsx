"use client";

import React, { useState, useTransition } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ListPagination } from "@/components/ui/ListPagination";
import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { processTicketScan } from "@/app/actions/processTicketScan";
import type { AttendeeManagementRow } from "@/lib/organizer/loadEventAttendees";
import { DEFAULT_LIST_PAGE_SIZE, slicePage } from "@/lib/ui/pagination";
import { useRouter } from "next/navigation";
import { AlertModal } from "../ui/AlertModal";
import { Alert } from "../ui/Alert";
import { loadBuyerInsight, type BuyerInsightData } from "@/lib/organizer/loadBuyerInsight";
import { BuyerInsightModal } from "./BuyerInsightModal";

type Props = {
  eventId: string;
  initialAttendees: AttendeeManagementRow[];
};

export function AttendeeManagementTable({ eventId, initialAttendees }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Modal & Error State
  const [confirmingCode, setConfirmingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Buyer Insight State
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [insightData, setInsightData] = useState<BuyerInsightData | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  // Derive unique ticket types for filter
  const ticketTypes = [...new Set(initialAttendees.map((a) => a.ticket_type_name))].sort();

  // Filter logic
  const filtered = initialAttendees.filter((a) => {
    const matchesSearch = 
      a.attendee_name.toLowerCase().includes(search.toLowerCase()) ||
      a.attendee_email.toLowerCase().includes(search.toLowerCase()) ||
      a.ticket_code.toLowerCase().includes(search.toLowerCase()) ||
      a.buyer.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesType = typeFilter === "all" || a.ticket_type_name === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const pageData = slicePage(filtered, page, DEFAULT_LIST_PAGE_SIZE);

  const activeTicket = confirmingCode ? initialAttendees.find(a => a.ticket_code === confirmingCode) : null;

  async function handleCheckIn() {
    if (!confirmingCode) return;
    const code = confirmingCode;
    setConfirmingCode(null);
    setErrorMessage(null);
    
    startTransition(async () => {
      const res = await processTicketScan(eventId, code, { source: "manual_registry" });
      if (!res.ok) {
        setErrorMessage(res.message);
      } else {
        router.refresh();
      }
    });
  }

  async function handleShowInsight(buyerId: string) {
    if (!buyerId) return;
    setSelectedBuyerId(buyerId);
    setInsightData(null);
    setIsInsightLoading(true);

    const res = await loadBuyerInsight(buyerId);
    if (res.ok) {
      setInsightData(res.data);
    } else {
      setErrorMessage(res.reason);
      setSelectedBuyerId(null);
    }
    setIsInsightLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      <AlertModal
        isOpen={!!confirmingCode}
        onClose={() => setConfirmingCode(null)}
        title="Confirm Check-In"
        description="Manual Arrival Verification"
        onConfirm={handleCheckIn}
        confirmLabel="Verify Arrival"
        variant="gold"
        loading={isPending}
      >
        <p>You are about to manually check in <strong>{activeTicket?.attendee_name}</strong> for their <strong>{activeTicket?.ticket_type_name}</strong> ticket.</p>
        <p className="mt-4 font-mono text-xs text-muted-foreground uppercase">TICKET: {confirmingCode}</p>
      </AlertModal>

      <BuyerInsightModal 
        isOpen={!!selectedBuyerId}
        onClose={() => setSelectedBuyerId(null)}
        data={insightData}
        isLoading={isInsightLoading}
      />

      {/* Global Error Alert */}
      {errorMessage && (
        <Alert type="error" title="Scan Failed" icon="✕">
          {errorMessage}
          <button onClick={() => setErrorMessage(null)} className="ml-2 underline text-[11px] font-bold">Dismiss</button>
        </Alert>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Search</label>
          <Input 
            placeholder="Name, email, or code..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Status</label>
          <select 
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-eventuz h-10 py-0"
          >
            <option value="all">All Status</option>
            <option value="issued">Issued</option>
            <option value="checked_in">Checked In</option>
            <option value="voided">Voided</option>
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">Ticket Type</label>
          <select 
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="input-eventuz h-10 py-0"
          >
            <option value="all">All Types</option>
            {ticketTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Registry Table */}
      <ScrollableTableWrapper
        footer={pageData.total > 0 ? (
          <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border">
            <p className="text-xs text-muted-foreground font-light">
              Showing <span className="font-semibold text-foreground">{pageData.rangeStart}</span> to <span className="font-semibold text-foreground">{pageData.rangeEnd}</span> of <span className="font-semibold text-foreground">{pageData.total}</span> attendees
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="h-8 px-3 text-xs"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= pageData.pageCount}
                onClick={() => setPage(p => p + 1)}
                className="h-8 px-3 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      >
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-4">Attendee</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Account</th>
              <th className="px-4 py-4">Purchaser</th>
              <th className="px-4 py-4">Ticket</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {pageData.slice.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic">
                  No attendees found matching your criteria.
                </td>
              </tr>
            ) : (
              pageData.slice.map((a) => (
                <tr key={a.id} className="group hover:bg-muted/5 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{a.attendee_name}</span>
                      <span className="text-xs text-muted-foreground font-light">{a.attendee_email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={a.status} type="ticket" />
                      {a.checked_in_at && (
                        <span className="text-[10px] text-success/80 font-medium">
                          {new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {a.is_registered ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success uppercase tracking-wider">
                        Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Guest
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <button 
                      onClick={() => handleShowInsight(a.buyer.user_id)}
                      className="flex flex-col text-left group/btn hover:opacity-80 transition-opacity"
                    >
                      <span className="text-xs font-semibold text-accent-gold group-hover/btn:underline underline-offset-4">{a.buyer.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{a.buyer.email}</span>
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-muted-foreground uppercase">{a.ticket_code}</span>
                      <span className="text-[10px] text-accent-gold font-medium">{a.ticket_type_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {a.status === "issued" ? (
                      <Button 
                        size="sm" 
                        variant="gold"
                        disabled={isPending}
                        onClick={() => setConfirmingCode(a.ticket_code)}
                        className="h-8 px-4 text-[10px] uppercase font-bold tracking-wider"
                      >
                        Check In
                      </Button>
                    ) : a.status === "checked_in" ? (
                      <span className="text-[10px] font-bold text-success uppercase tracking-widest px-2">
                        At Venue
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground italic px-2">
                        Voided
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollableTableWrapper>
    </div>
  );
}
