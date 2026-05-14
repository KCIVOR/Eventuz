"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type SeatingTabId = "map" | "inventory";

const TAB_DEFS: { id: SeatingTabId; label: string }[] = [
  { id: "map", label: "Overview" },
  { id: "inventory", label: "Seat inventory" },
];

function isTabId(v: string | null): v is SeatingTabId {
  return v === "map" || v === "inventory";
}

type Props = {
  eventId: string;
  defaultTab: SeatingTabId;
  mapContent: React.ReactNode;
  inventoryContent: React.ReactNode;
};

export function OrganizerSeatingTabs({
  eventId,
  defaultTab,
  mapContent,
  inventoryContent,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = useMemo(() => {
    const raw = searchParams.get("tab");
    return isTabId(raw) ? raw : defaultTab;
  }, [searchParams, defaultTab]);

  const setTab = useCallback(
    (id: SeatingTabId) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("tab", id);
      sp.delete("ok");
      sp.delete("error");
      router.replace(`/organizer/events/${eventId}/seating?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams, eventId]
  );

  const panels: Record<SeatingTabId, React.ReactNode> = {
    map: mapContent,
    inventory: inventoryContent,
  };

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
              id={`seating-tab-${t.id}`}
              aria-controls={`seating-panel-${t.id}`}
              className={
                "mb-[-1px] border-b-2 px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFAF4] " +
                (selected
                  ? "border-[#C9A96E] text-[#C9A96E]"
                  : "border-transparent text-[#7A6E68] hover:text-[#C9A96E]")
              }
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {TAB_DEFS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`seating-panel-${t.id}`}
          aria-labelledby={`seating-tab-${t.id}`}
          hidden={activeTab !== t.id}
        >
          {panels[t.id]}
        </div>
      ))}
    </div>
  );
}
