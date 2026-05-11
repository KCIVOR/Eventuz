"use client";

import { organizerPanel } from "@/components/organizer/eventSetupStyles";
import { useId, useState, type ReactNode } from "react";

type Props = {
  ticketTypeId: string;
  title: string;
  summary: string;
  statusBadge: ReactNode;
  /** When false (default for many types), body starts collapsed */
  defaultExpanded?: boolean;
  children: ReactNode;
};

export function CollapsibleTicketTypeCard({
  ticketTypeId,
  title,
  summary,
  statusBadge,
  defaultExpanded = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultExpanded);
  const baseId = useId();
  const panelId = `${baseId}-panel-${ticketTypeId}`;
  const buttonId = `${baseId}-trigger-${ticketTypeId}`;

  return (
    <li
      className={
        organizerPanel +
        " overflow-hidden transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(28,25,23,0.08)]"
      }
    >
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-border px-5 py-4 text-left transition-colors duration-150 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">{summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusBadge}
          <svg
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="border-t border-border/60 px-5 pb-5 pt-4"
      >
        {children}
      </div>
    </li>
  );
}
