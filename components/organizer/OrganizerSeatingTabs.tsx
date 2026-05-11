"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type SeatingTabId = "map" | "inventory" | "tables";

const TAB_DEFS: { id: SeatingTabId; label: string }[] = [
  { id: "map", label: "Overview" },
  { id: "inventory", label: "Seat inventory" },
  { id: "tables", label: "Tables" },
];

function isTabId(v: string | null): v is SeatingTabId {
  return v === "map" || v === "inventory" || v === "tables";
}

type Props = {
  eventId: string;
  defaultTab: SeatingTabId;
  mapContent: React.ReactNode;
  inventoryContent: React.ReactNode;
  tablesContent: React.ReactNode;
};

export function OrganizerSeatingTabs({
  eventId,
  defaultTab,
  mapContent,
  inventoryContent,
  tablesContent,
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
    tables: tablesContent,
  };

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Seat page sections"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
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
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] " +
                (selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground")
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
