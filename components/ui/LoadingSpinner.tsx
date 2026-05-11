import type { HTMLAttributes } from "react";

type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "h-5 w-5 border-2",
  md: "h-9 w-9 border-2",
  lg: "h-12 w-12 border-[3px]",
};

type Props = {
  size?: Size;
  /** When false, exposes `role="status"` for standalone use (no nearby visible label). Default: decorative (aria-hidden). */
  labelled?: boolean;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

/**
 * Reusable busy indicator — uses Tailwind `animate-spin` (not `animate-pulse`).
 * Visually: ring with a stronger top segment that rotates.
 */
export function LoadingSpinner({ size = "md", labelled = false, className = "", ...rest }: Props) {
  return (
    <span
      {...(labelled
        ? { role: "status" as const, "aria-label": "Loading" }
        : { "aria-hidden": true as const })}
      className={`inline-block ${sizeClass[size]} shrink-0 animate-spin rounded-full border-primary/20 border-t-primary ${className}`.trim()}
      {...rest}
    />
  );
}
