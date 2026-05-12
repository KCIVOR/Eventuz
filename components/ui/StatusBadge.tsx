import React from "react";

type BadgeType = "order" | "payment" | "scan" | "generic";

type Props = {
  status: string;
  type?: BadgeType;
  className?: string;
};

export function StatusBadge({ status, type = "generic", className = "" }: Props) {
  const normalized = status.toLowerCase().trim();

  // Unified styling base
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors";

  // Logic map for colors
  const getColors = (): string => {
    // 1. Success variants
    if (["completed", "succeeded", "valid", "active", "published", "yes"].includes(normalized)) {
      return "border-success/35 bg-success-muted text-success";
    }

    // 2. Warning / Pending variants
    if (["paid_unassigned", "partially_assigned", "pending", "duplicate", "capacity_held", "payment_pending"].includes(normalized)) {
      return "border-warning/35 bg-warning/10 text-warning";
    }

    // 3. Primary / Brand variants (Used for emphasis in certain states)
    if (["issued", "assigned"].includes(normalized)) {
      return "border-primary/30 bg-primary/10 text-primary";
    }

    // 4. Destructive / Error variants
    if (["payment_failed", "failed", "invalid", "voided", "cancelled", "disabled"].includes(normalized)) {
      return "border-destructive/30 bg-destructive-muted text-destructive";
    }

    // 5. Muted / Expired variants
    if (["expired", "voided", "no", "inactive"].includes(normalized)) {
      return "border-border bg-muted text-muted-foreground";
    }

    return "border-border bg-muted text-foreground";
  };

  return (
    <span className={`${base} ${getColors()} ${className}`} role="status">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {status.replace(/_/g, " ")}
    </span>
  );
}
