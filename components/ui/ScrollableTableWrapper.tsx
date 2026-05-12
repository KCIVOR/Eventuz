import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Standardizes the scrollable table pattern with a subtle border-radius and overflow handling.
 * Ensures that tables look premium on mobile and desktop without breaking the panel layout.
 */
export function ScrollableTableWrapper({ children, className = "" }: Props) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(28,25,23,0.04)] ${className}`.trim()}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
