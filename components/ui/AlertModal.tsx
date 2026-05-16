"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  variant?: "default" | "destructive" | "gold";
  loading?: boolean;
};

export function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  confirmLabel = "Confirm",
  onConfirm,
  variant = "default",
  loading = false,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-obsidian/65 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-[2px] shadow-2xl animate-drop-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-background/50">
          <h3 className="font-serif text-2xl font-light text-foreground leading-tight">{title}</h3>
          {description && <p className="mt-1 text-xs text-muted-foreground font-light">{description}</p>}
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-sm text-charcoal font-light leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-background/30 flex items-center justify-end gap-3">
          {actions ? (
            actions
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClose}
                disabled={loading}
                className="h-9 px-5 text-[11px] font-semibold tracking-wider"
              >
                Cancel
              </Button>
              {onConfirm && (
                <Button 
                  variant={variant === "gold" ? "gold" : variant === "destructive" ? "destructive" : "primary"}
                  size="sm"
                  onClick={onConfirm}
                  isLoading={loading}
                  className="h-9 px-6 text-[11px] font-semibold tracking-wider"
                >
                  {confirmLabel}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
