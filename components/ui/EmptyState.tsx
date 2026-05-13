import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

/** DS-aligned empty state — dashed border, champagne diamond accent, Cormorant heading. */
export function EmptyState({ title, description, children, className = "" }: Props) {
  return (
    <div
      style={{
        border: "1px dashed #EDE8E3",
        borderRadius: "2px",
        background: "#FDFAF4",
        padding: "48px 32px",
        textAlign: "center",
      }}
      className={className}
    >
      {/* DS diamond ornament */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "20px" }}>
        <span style={{ width: "40px", height: "1px", background: "linear-gradient(to right, transparent, #EDE8E3)" }} />
        <div style={{ width: "5px", height: "5px", background: "#C9A96E", transform: "rotate(45deg)", flexShrink: 0 }} />
        <span style={{ width: "40px", height: "1px", background: "linear-gradient(to left, transparent, #EDE8E3)" }} />
      </div>

      {/* Title — DS .card-title / Cormorant Garamond */}
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "22px",
          fontWeight: 400,
          color: "#1A1512",
          lineHeight: 1.2,
        }}
      >
        {title}
      </p>

      {description ? (
        <p
          style={{
            fontSize: "13px",
            fontWeight: 300,
            color: "#7A6E68",
            lineHeight: 1.75,
            maxWidth: "420px",
            margin: "10px auto 0",
          }}
        >
          {description}
        </p>
      ) : null}

      {children ? (
        <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
