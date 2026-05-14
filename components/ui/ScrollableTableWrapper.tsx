import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** 
 * Enforces a horizontal scroll on small screens for tables.
 * Styled to match the design system's card panels.
 */
export function ScrollableTableWrapper({ children, footer, className = "" }: Props) {
  return (
    <div 
      className={`w-full ${className}`.trim()}
      style={{
        border: "1px solid #EDE8E3",
        borderRadius: "2px",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(26,21,18,0.02)",
        overflow: "hidden"
      }}
    >
      <div className="w-full overflow-x-auto">
        {children}
      </div>
      {footer && (
        <div className="border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
}
