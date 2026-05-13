import React from "react";

type BadgeType = "order" | "payment" | "scan" | "generic";

type Props = {
  status: string;
  type?: BadgeType;
  className?: string;
};

export function StatusBadge({ status, type = "generic", className = "" }: Props) {
  const normalized = status.toLowerCase().trim();

  // DS .sp-* badge base — pill shape, tight tracking
  const base: React.CSSProperties = {
    display: "inline-block",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: "9999px", // DS uses 100px for pill
    fontFamily: "'Jost', sans-serif",
  };

  // DS color map — exact from .sp-confirmed / .sp-pending / .sp-cancelled
  const getStyle = (): React.CSSProperties => {
    // Success / confirmed
    if (["completed", "succeeded", "valid", "active", "published", "yes", "confirmed"].includes(normalized)) {
      return { ...base, background: "#DFF0E6", color: "#2A6645" };
    }
    // Warning / pending
    if (["paid_unassigned", "partially_assigned", "pending", "duplicate", "capacity_held", "payment_pending"].includes(normalized)) {
      return { ...base, background: "#F5EDD8", color: "#7A5420" };
    }
    // Brand / gold — assigned/issued states
    if (["issued", "assigned"].includes(normalized)) {
      return { ...base, background: "#F0E4CC", color: "#8B6914" };
    }
    // Cancelled / error
    if (["payment_failed", "failed", "invalid", "voided", "cancelled", "disabled"].includes(normalized)) {
      return { ...base, background: "#F5DFDF", color: "#7A2020" };
    }
    // Muted / expired
    if (["expired", "no", "inactive"].includes(normalized)) {
      return { ...base, background: "#EDE8E3", color: "#7A6E68" };
    }

    return { ...base, background: "#EDE8E3", color: "#2E2825" };
  };

  return (
    <span style={getStyle()} role="status" className={className}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
