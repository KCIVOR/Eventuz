import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, hint, ...props }, ref) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
        {label && (
          // DS .fl — form label
          <label
            htmlFor={props.id || props.name}
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#7A6E68",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`input-eventuz ${error ? "input-error" : ""} ${className}`}
          suppressHydrationWarning
          style={error ? { borderColor: "#C0534B" } : undefined}
          {...props}
        />
        {/* DS .fe — form error */}
        {error && (
          <p style={{ fontSize: "12px", color: "#C0534B", marginTop: "2px", fontWeight: 300 }}>
            {error}
          </p>
        )}
        {/* DS .fh — form hint */}
        {hint && !error && (
          <p style={{ fontSize: "12px", color: "#7A6E68", marginTop: "2px", fontWeight: 300 }}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
