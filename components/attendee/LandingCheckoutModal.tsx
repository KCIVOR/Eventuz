"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CapacityHoldForm } from "./CapacityHoldForm";
import type { TicketTypeWithSlots } from "@/lib/attendee/eventContext";

type Props = {
  eventId: string;
  ticketTypes: TicketTypeWithSlots[];
  activeHold: Record<string, unknown> | null;
  resumeCheckoutUrl?: string | null;
  showDevHitPaySimulate?: boolean;
};

export function LandingCheckoutModal({
  eventId,
  ticketTypes,
  activeHold,
  resumeCheckoutUrl,
  showDevHitPaySimulate = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("checkout") === "1" || searchParams.get("checkout") === "true") {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    // Remove the ?checkout=1 from URL without reloading
    const newUrl = window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface-app border border-border shadow-2xl rounded-2xl overflow-hidden my-8 mt-16 sm:mt-8">
        <div className="flex justify-between items-center p-6 border-b border-border/50 sticky top-0 bg-surface-app z-10">
          <h2 className="font-serif text-2xl text-foreground">Complete Your Order</h2>
          <button 
            onClick={handleClose} 
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <CapacityHoldForm
            eventId={eventId}
            ticketTypes={ticketTypes}
            activeHold={activeHold}
            resumeCheckoutUrl={resumeCheckoutUrl}
            showDevHitPaySimulate={showDevHitPaySimulate}
          />
        </div>
      </div>
    </div>
  );
}
