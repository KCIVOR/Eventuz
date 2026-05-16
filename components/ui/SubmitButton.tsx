"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

/**
 * A specialized Button for use inside forms.
 * Automatically handles the loading state via useFormStatus().
 */
export function SubmitButton({ children, isLoading, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      {...props} 
      type="submit" 
      isLoading={pending || isLoading} 
      disabled={pending || disabled}
    >
      {children}
    </Button>
  );
}
