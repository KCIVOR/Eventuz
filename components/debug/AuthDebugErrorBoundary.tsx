"use client";

import { isAuthDebugEnabled } from "@/lib/auth/debug";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * If `AuthDebugPanel` throws during render, log to F12 console and hide the panel.
 * Filter console: `eventuz:auth:panel:crash`
 */
export class AuthDebugErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (!isAuthDebugEnabled()) return;
    console.error("[eventuz:auth:panel:crash]", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.error) return null;
    return this.props.children;
  }
}
