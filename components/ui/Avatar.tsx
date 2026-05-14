import React from "react";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[8px]",
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-sm",
};

/**
 * Eternal Affair themed Avatar component.
 * Features a Champagne gold border and Ivory background fallback with initials.
 */
export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#C9A96E]/30 bg-[#FDFAF4] ${sizeClasses[size]} ${className}`}
      style={{
        boxShadow: "0 2px 8px rgba(26,21,18,0.04)",
      }}
    >
      {src ? (
        <img src={src} alt={name || "User avatar"} className="h-full w-full object-cover" />
      ) : (
        <span className="font-semibold text-[#8B6914] tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>
          {initials}
        </span>
      )}
    </div>
  );
}
