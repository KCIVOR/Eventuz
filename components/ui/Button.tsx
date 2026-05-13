import React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "gold" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 " +
  "font-sans text-[12px] font-medium tracking-[0.2em] uppercase border-none";

const variants: Record<ButtonVariant, string> = {
  // .btn-primary — obsidian bg → gold on hover
  primary:
    "bg-[#1A1512] text-[#FDFAF4] rounded-[1px] hover:bg-[#C9A96E] hover:text-[#1A1512] active:scale-[0.98]",
  // .btn-outline — transparent → obsidian on hover (same as secondary in DS)
  secondary:
    "bg-transparent text-[#1A1512] border border-[#1A1512] rounded-[1px] hover:bg-[#1A1512] hover:text-[#FDFAF4] active:scale-[0.98]",
  // alias — same as secondary/outline
  outline:
    "bg-transparent text-[#1A1512] border border-[#1A1512] rounded-[1px] hover:bg-[#1A1512] hover:text-[#FDFAF4] active:scale-[0.98]",
  // .btn-gold
  gold:
    "bg-[#C9A96E] text-[#1A1512] rounded-[1px] hover:bg-[#8B6914] hover:text-[#FDFAF4] active:scale-[0.98]",
  // .btn-ghost — gold border
  ghost:
    "bg-transparent text-[#C9A96E] border border-[#C9A96E] rounded-[1px] hover:bg-[#C9A96E] hover:text-[#1A1512] active:scale-[0.98]",
  // .btn-blush → destructive variant
  destructive:
    "bg-[#FCEAEA] text-[#C0534B] border border-[rgba(192,83,75,0.2)] rounded-[1px] hover:bg-[#C0534B] hover:text-white",
};

// DS sizes: sm = 9/20, default = 14/32, lg = 18/44, icon = 11px padding
const sizes: Record<ButtonSize, string> = {
  sm:   "px-5 py-2 text-[11px]",
  md:   "px-8 py-[14px]",
  lg:   "px-11 py-[18px] text-[13px]",
  icon: "h-10 w-10 p-0",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading,
  asChild,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const finalClassName = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: `${finalClassName} ${child.props.className || ""}`,
      ...props,
    });
  }

  return (
    <button
      className={finalClassName}
      disabled={disabled || isLoading}
      suppressHydrationWarning
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
