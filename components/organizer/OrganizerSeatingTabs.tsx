"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

export type SeatingTabId = "map" | "inventory" | "floor-plan";

const TAB_DEFS: { id: SeatingTabId; label: string }[] = [
  { id: "map", label: "Overview" },
  { id: "inventory", label: "Seat inventory" },
  { id: "floor-plan", label: "Floor Plan Designer" },
];

function isTabId(v: string | null): v is SeatingTabId {
  return v === "map" || v === "inventory" || v === "floor-plan";
}

type Props = {
  eventId: string;
  defaultTab: SeatingTabId;
  mapContent: React.ReactNode;
  inventoryContent: React.ReactNode;
  floorPlanContent: React.ReactNode;
};

export function OrganizerSeatingTabs({
  eventId,
  defaultTab,
  mapContent,
  inventoryContent,
  floorPlanContent,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [loadingTab, setLoadingTab] = useState<SeatingTabId | null>(null);

  const activeTab = useMemo(() => {
    const raw = searchParams.get("tab");
    return isTabId(raw) ? raw : defaultTab;
  }, [searchParams, defaultTab]);

  useEffect(() => {
    if (!loadingTab || loadingTab !== activeTab) return;
    const timeout = window.setTimeout(() => setLoadingTab(null), 250);
    return () => window.clearTimeout(timeout);
  }, [activeTab, loadingTab]);

  const setTab = useCallback(
    (id: SeatingTabId) => {
      if (id === activeTab || loadingTab) return;
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("tab", id);
      sp.delete("ok");
      sp.delete("error");
      setLoadingTab(id);
      startTransition(() => {
        router.replace(`/organizer/events/${eventId}/seating?${sp.toString()}`, { scroll: false });
      });
    },
    [activeTab, loadingTab, router, searchParams, eventId]
  );

  const panels: Record<SeatingTabId, React.ReactNode> = {
    map: mapContent,
    inventory: inventoryContent,
    "floor-plan": floorPlanContent,
  };

  const loadingLabel =
    loadingTab === "inventory"
      ? "seat inventory"
      : loadingTab === "floor-plan"
        ? "floor plan designer"
        : "overview";

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Seat page sections"
        className="flex flex-wrap border-b border-[#EDE8E3]"
      >
        {TAB_DEFS.map((t) => {
          const selected = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              suppressHydrationWarning
              aria-selected={selected}
              disabled={Boolean(loadingTab)}
              id={`seating-tab-${t.id}`}
              aria-controls={`seating-panel-${t.id}`}
              className={
                "mb-[-1px] border-b-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFAF4] " +
                (selected
                  ? "border-[#C9A96E] text-[#C9A96E]"
                  : "border-transparent text-[#7A6E68] hover:text-[#C9A96E]") +
                (loadingTab ? " cursor-wait opacity-70" : "")
              }
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-[18rem]">
        {(isPending || loadingTab) ? (
          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-center rounded-2xl bg-[#FDFAF4]/80 px-4 py-8 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-full border border-[#EDE8E3] bg-[#FDFAF4] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#7A6E68] shadow-sm">
              <LoadingSpinner size="sm" />
              Loading {loadingLabel}
            </div>
          </div>
        ) : null}

        {TAB_DEFS.map((t) => (
          <div
            key={t.id}
            role="tabpanel"
            id={`seating-panel-${t.id}`}
            aria-labelledby={`seating-tab-${t.id}`}
            hidden={activeTab !== t.id}
            aria-busy={Boolean(isPending || loadingTab)}
            className={(isPending || loadingTab) && activeTab === t.id ? "pointer-events-none opacity-45 transition-opacity" : undefined}
          >
            {panels[t.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
