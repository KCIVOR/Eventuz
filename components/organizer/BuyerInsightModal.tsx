"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BuyerInsightData } from "@/lib/organizer/loadBuyerInsight";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: BuyerInsightData | null;
  isLoading: boolean;
};

const PAGE_SIZE = 5;

export function BuyerInsightModal({ isOpen, onClose, data, isLoading }: Props) {
  const [mounted, setMounted] = useState(false);
  
  // Filtering & Pagination State
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentPage, setPaymentPage] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Reset pages when opening
      setOrderPage(1);
      setPaymentPage(1);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Derived filtered orders
  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return data.orders.filter(o => 
      o.event_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.ticket_type_name.toLowerCase().includes(orderSearch.toLowerCase())
    );
  }, [data, orderSearch]);

  // Derived filtered payments
  const filteredPayments = useMemo(() => {
    if (!data) return [];
    return data.payments.filter(p => 
      (p.provider_payment_id || "").toLowerCase().includes(paymentSearch.toLowerCase()) ||
      (p.provider_checkout_id || "").toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.provider.toLowerCase().includes(paymentSearch.toLowerCase())
    );
  }, [data, paymentSearch]);

  // Pagination slicing
  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, orderPage]);

  const paginatedPayments = useMemo(() => {
    const start = (paymentPage - 1) * PAGE_SIZE;
    return filteredPayments.slice(start, start + PAGE_SIZE);
  }, [filteredPayments, paymentPage]);

  if (!mounted || !isOpen) return null;

  const totalOrderPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const totalPaymentPages = Math.ceil(filteredPayments.length / PAGE_SIZE);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1A1512]/75 backdrop-blur-md animate-in fade-in duration-500" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-5xl max-h-[96vh] sm:max-h-[92vh] overflow-hidden bg-[#FDFAF4] rounded-[2px] border border-[#C9A96E]/30 shadow-[0_32px_128px_rgba(26,21,18,0.25)] flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header - Eternal Affair Style */}
        <div className="relative overflow-hidden bg-[#1A1512] px-5 py-6 sm:px-8 sm:py-8 border-b border-[#C9A96E]/30 flex-shrink-0">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-[#C9A96E]/5 blur-[100px] rounded-full" />
          </div>
          
          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.4em] text-[#C9A96E] uppercase">Purchaser Insight</p>
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-light text-[#FDFAF4] leading-tight italic">
                Buyer Record Overview
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="flex-shrink-0 h-9 w-9 sm:h-11 sm:w-11 flex items-center justify-center rounded-full border border-[#C9A96E]/40 text-[#C9A96E] hover:bg-[#C9A96E] hover:text-[#1A1512] transition-all duration-300 group mt-0.5"
            >
              <span className="text-base sm:text-xl font-light">✕</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar bg-[#FDFAF4]">
          {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center">
              <div className="h-12 w-12 border-[1px] border-[#C9A96E] border-t-transparent rounded-full animate-spin mb-6" />
              <p className="font-serif text-xl italic text-[#7A6E68]">Retrieving deep-link insights...</p>
            </div>
          ) : data ? (
            <>
              {/* Profile Overview Section */}
              <section className="p-5 sm:p-8 border-b border-[#EDE8E3]">
                <div className="grid lg:grid-cols-12 gap-6 lg:gap-10">
                  <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-gradient-to-tr from-[#C9A96E] to-[#E8C4C4] rounded-full opacity-20 blur-sm" />
                      <div className="relative h-32 w-32 rounded-full border border-[#C9A96E]/40 bg-white flex items-center justify-center overflow-hidden">
                        {data.profile.avatar_url ? (
                          <img src={data.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-5xl font-serif text-[#C9A96E]">{data.profile.full_name.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-serif text-2xl text-[#1A1512]">{data.profile.full_name}</h3>
                      <p className="text-sm font-light text-[#7A6E68]">{data.profile.email}</p>
                    </div>
                    <div className="w-full pt-4 grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white border border-[#EDE8E3] rounded-sm">
                        <p className="text-[9px] font-bold text-[#C9A96E] uppercase tracking-widest mb-1">Joined</p>
                        <p className="text-xs font-medium">{new Date(data.profile.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="p-3 bg-white border border-[#EDE8E3] rounded-sm">
                        <p className="text-[9px] font-bold text-[#C9A96E] uppercase tracking-widest mb-1">Total Orders</p>
                        <p className="text-xs font-medium">{data.orders.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:col-span-8 grid gap-6 content-start">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-widest mb-2">Biography</p>
                          <p className="text-sm font-light leading-relaxed text-[#2E2825] italic bg-white/50 p-4 border border-[#EDE8E3] min-h-[100px]">
                            {data.profile.bio || "No professional biography provided."}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-widest mb-2">Professional Details</p>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-semibold text-[#AEA89F] w-20">PHONE</span>
                              <span className="text-sm font-light">{data.profile.phone_number || "—"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-semibold text-[#AEA89F] w-20">COMPANY</span>
                              <span className="text-sm font-light">{data.profile.organization_name || "—"}</span>
                            </div>
                            <div className="flex items-start gap-3">
                              <span className="text-[10px] font-semibold text-[#AEA89F] w-20">ADDRESS</span>
                              <span className="text-sm font-light leading-snug">{data.profile.address || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Purchase History Section */}
              <section className="p-5 sm:p-8 space-y-5">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-widest">Global History</p>
                    <h4 className="font-serif text-2xl">Purchase Records</h4>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A96E]">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      <input 
                        type="text" 
                        placeholder="Search event or ticket..." 
                        value={orderSearch}
                        onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }}
                        className="pl-10 pr-4 py-2 bg-white border border-[#EDE8E3] rounded-sm text-xs focus:border-[#C9A96E] outline-none w-full sm:w-64 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="tw border border-[#EDE8E3] rounded-sm overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-[#1A1512]">
                      <tr className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#FDFAF4]">
                        <th className="py-4 px-6">Event / Date</th>
                        <th className="py-4 px-6">Ticket Type</th>
                        <th className="py-4 px-6">Qty</th>
                        <th className="py-4 px-6">Total Amount</th>
                        <th className="py-4 px-6 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDE8E3]">
                      {paginatedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#7A6E68] italic font-light">No purchase records matching your search.</td>
                        </tr>
                      ) : paginatedOrders.map(o => (
                        <tr key={o.id} className="hover:bg-[#FDF6EE]/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-medium text-[#1A1512]">{o.event_name}</span>
                              <span className="text-[10px] text-[#AEA89F]">{new Date(o.event_date).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs text-[#2E2825]">{o.ticket_type_name}</td>
                          <td className="py-4 px-6 text-xs font-medium text-[#1A1512]">{o.quantity}</td>
                          <td className="py-4 px-6 text-xs font-mono font-bold text-[#C9A96E]">PHP {o.total_amount.toLocaleString()}</td>
                          <td className="py-4 px-6 text-right">
                            <StatusBadge status={o.status} type="order" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {totalOrderPages > 1 && (
                  <div className="flex justify-center pt-2">
                    <div className="pagination flex gap-1">
                      <button 
                        onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                        disabled={orderPage === 1}
                        className="pg-btn disabled:opacity-30"
                      >←</button>
                      {[...Array(totalOrderPages)].map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => setOrderPage(i + 1)}
                          className={`pg-btn ${orderPage === i + 1 ? 'active' : ''}`}
                        >{i + 1}</button>
                      ))}
                      <button 
                        onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))}
                        disabled={orderPage === totalOrderPages}
                        className="pg-btn disabled:opacity-30"
                      >→</button>
                    </div>
                  </div>
                )}
              </section>

              {/* Financial Records Section */}
              <section className="p-5 sm:p-8 bg-[#F7F4EF] border-t border-[#EDE8E3] space-y-5">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-widest">Transaction Audit</p>
                    <h4 className="font-serif text-2xl">Financial Records</h4>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A96E]">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    <input 
                      type="text" 
                      placeholder="Search ID or provider..." 
                      value={paymentSearch}
                      onChange={(e) => { setPaymentSearch(e.target.value); setPaymentPage(1); }}
                      className="pl-10 pr-4 py-2 bg-white border border-[#EDE8E3] rounded-sm text-xs focus:border-[#C9A96E] outline-none w-full sm:w-64 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid gap-6">
                  {paginatedPayments.length === 0 ? (
                    <div className="py-12 bg-white border border-[#EDE8E3] rounded-sm text-center text-[#7A6E68] italic font-light shadow-sm">No transaction records found.</div>
                  ) : paginatedPayments.map(p => (
                    <div key={p.id} className="group relative bg-white border border-[#EDE8E3] p-4 sm:p-6 rounded-sm shadow-sm hover:border-[#C9A96E]/40 transition-all flex flex-col gap-4">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C9A96E] opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold px-2 py-1 bg-[#1A1512] text-[#C9A96E] rounded-xs uppercase">{p.provider}</span>
                          <span className="text-[10px] font-medium text-[#AEA89F] font-mono">#{p.id.slice(0, 8)}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-[#C9A96E] uppercase tracking-wider">HitPay Payment ID</p>
                            <p className="text-xs font-mono font-medium truncate max-w-[200px]" title={p.provider_payment_id || "N/A"}>
                              {p.provider_payment_id || <span className="text-[#AEA89F] italic opacity-50">Not Available</span>}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-[#C9A96E] uppercase tracking-wider">Checkout Reference</p>
                            <p className="text-xs font-mono font-medium truncate max-w-[200px]" title={p.provider_checkout_id || "N/A"}>
                              {p.provider_checkout_id || <span className="text-[#AEA89F] italic opacity-50">Not Available</span>}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-[#C9A96E] uppercase tracking-wider">Processed On</p>
                            <p className="text-xs font-medium">{new Date(p.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t border-[#EDE8E3] pt-4">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[#AEA89F] uppercase mb-1">Total Amount</p>
                          <p className="font-serif text-2xl text-[#1A1512]">{p.currency} {p.amount.toLocaleString()}</p>
                        </div>
                        <StatusBadge status={p.status} type="payment" />
                      </div>
                    </div>
                  ))}
                </div>

                {totalPaymentPages > 1 && (
                  <div className="flex justify-center pt-2">
                    <div className="pagination flex gap-1">
                      <button 
                        onClick={() => setPaymentPage(p => Math.max(1, p - 1))}
                        disabled={paymentPage === 1}
                        className="pg-btn disabled:opacity-30"
                      >←</button>
                      {[...Array(totalPaymentPages)].map((_, i) => (
                        <button 
                          key={i} 
                          onClick={() => setPaymentPage(i + 1)}
                          className={`pg-btn ${paymentPage === i + 1 ? 'active' : ''}`}
                        >{i + 1}</button>
                      ))}
                      <button 
                        onClick={() => setPaymentPage(p => Math.min(totalPaymentPages, p + 1))}
                        disabled={paymentPage === totalPaymentPages}
                        className="pg-btn disabled:opacity-30"
                      >→</button>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="py-32 text-center text-[#C0534B] italic">
              <p className="font-serif text-xl mb-2">Record Retrieval Failed</p>
              <p className="text-sm font-light text-[#7A6E68]">The requested buyer data could not be localized.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-[#EDE8E3] flex justify-end bg-white flex-shrink-0">
          <Button variant="gold" onClick={onClose} className="px-12 h-11 tracking-widest font-bold">Close Insight Record</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

