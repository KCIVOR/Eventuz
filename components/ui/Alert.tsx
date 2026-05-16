import React from "react";
import { cn } from "@/lib/utils";

type AlertType = "success" | "info" | "warning" | "error";

type Props = {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
};

const typeConfig: Record<AlertType, { class: string; icon: string }> = {
  success: { class: "a-success", icon: "✓" },
  info: { class: "a-info", icon: "ℹ" },
  warning: { class: "a-warning", icon: "⚠" },
  error: { class: "a-error", icon: "✕" },
};

export function Alert({ type = "info", title, children, className, icon }: Props) {
  const config = typeConfig[type];

  return (
    <div className={cn("alert", config.class, className)}>
      <span className="alert-icon">{icon || config.icon}</span>
      <div className="flex flex-col">
        {title && <div className="alert-title">{title}</div>}
        <div className="text-[13px] leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
