import type { HTMLAttributes } from "react";

type Size = "sm" | "md" | "lg";

// DS spinner uses champagne gold ring — matches brand primary accent
const sizeStyle: Record<Size, { width: string; height: string; borderWidth: string }> = {
  sm: { width: "20px", height: "20px", borderWidth: "2px" },
  md: { width: "36px", height: "36px", borderWidth: "2px" },
  lg: { width: "48px", height: "48px", borderWidth: "3px" },
};

type Props = {
  size?: Size;
  labelled?: boolean;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

export function LoadingSpinner({ size = "md", labelled = false, className = "", style, ...rest }: Props) {
  const { width, height, borderWidth } = sizeStyle[size];

  return (
    <span
      {...(labelled
        ? { role: "status" as const, "aria-label": "Loading" }
        : { "aria-hidden": true as const })}
      className={`inline-block shrink-0 animate-spin ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: "9999px",
        borderStyle: "solid",
        borderWidth,
        borderColor: "#EDE8E3",
        borderTopColor: "#C9A96E", // DS champagne gold on top segment
        ...style,
      }}
      {...rest}
    />
  );
}
