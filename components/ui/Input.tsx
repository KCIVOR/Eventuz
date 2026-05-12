import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={props.id || props.name} className="label-eventuz">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`input-eventuz ${className}`}
          // suppressHydrationWarning is critical to ignore browser-injected attributes like fdprocessedid
          suppressHydrationWarning
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
