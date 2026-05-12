import React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
}

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
  const base =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-40";

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(127,29,29,0.15)] hover:bg-primary-hover active:scale-[0.98]",
    secondary: "bg-card border border-border/80 text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:bg-muted active:scale-[0.98]",
    outline: "border border-primary/20 bg-transparent text-primary hover:bg-primary/5 active:scale-[0.98]",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
    destructive: "border border-destructive/20 bg-destructive-muted text-destructive hover:bg-destructive/15",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "h-9 w-9 p-0",
  };

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
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
