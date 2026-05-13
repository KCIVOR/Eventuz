"use client";

import {
  authCookieNamesForLog,
  authPanelConsole,
  authSupabaseApiHost,
  isAuthDebugEnabled,
} from "@/lib/auth/debug";
import { useEffect } from "react";

function cookiePairsFromDocument(): { name: string }[] {
  if (typeof document === "undefined") return [];
  return document.cookie.split("; ").reduce<{ name: string }[]>((acc, part) => {
    const eq = part.indexOf("=");
    const name = (eq >= 0 ? part.slice(0, eq) : part).trim();
    if (name) acc.push({ name });
    return acc;
  }, []);
}

/**
 * Runs on every page after hydration — including `/login?next=…` when middleware
 * redirects before the protected route ever mounts. Logs only cookie *names* and
 * public config hints (no tokens).
 */
export function AuthDebugConsoleBoot() {
  useEffect(() => {
    if (!isAuthDebugEnabled()) return;

    const search = typeof window !== "undefined" ? window.location.search : "";
    const nextParam = new URLSearchParams(search).get("next");
    const pairs = cookiePairsFromDocument();
    const { supabaseAuthCookieCount, supabaseAuthCookieNames } =
      authCookieNamesForLog(pairs);

    const payload = {
      hint: nextParam
        ? "Middleware likely redirected here (see ?next=). Compare cookie count to a working tab."
        : "Landing boot log — auth debug is on.",
      href: typeof window !== "undefined" ? window.location.href : "",
      origin: typeof window !== "undefined" ? window.location.origin : "",
      path: typeof window !== "undefined" ? window.location.pathname : "",
      nextParam,
      nodeEnv: process.env.NODE_ENV,
      supabaseApiHost: authSupabaseApiHost(),
      hasPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
      hasPublicAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
      supabaseAuthCookieCount,
      supabaseAuthCookieNames,
    };

    authPanelConsole("page_boot", payload);

    // Default filter levels always show `console.log` (Info can be turned off in DevTools).
    console.log(
      "%c[eventuz:auth] page_boot",
      "background:#78350f;color:#fef3c7;font-weight:bold;padding:2px 6px;border-radius:4px",
      payload
    );
  }, []);

  return null;
}
