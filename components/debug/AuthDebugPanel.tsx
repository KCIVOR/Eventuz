"use client";

import {
  authCookieNamesForLog,
  authDebug,
  authSupabaseApiHost,
  isAuthDebugEnabled,
} from "@/lib/auth/debug";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Snapshot = {
  userId: string | null;
  email: string | null;
  getUserError: string | null;
  supabaseApiHost: string | null;
  documentCookieNames: string[];
  updatedAt: string;
};

function cookieNamesFromDocument(): { name: string }[] {
  if (typeof document === "undefined") return [];
  return document.cookie.split("; ").reduce<{ name: string }[]>((acc, part) => {
    const eq = part.indexOf("=");
    const name = (eq >= 0 ? part.slice(0, eq) : part).trim();
    if (name) acc.push({ name });
    return acc;
  }, []);
}

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [a, domain] = email.split("@");
  if (!domain) return "***";
  const head = a.slice(0, 2);
  return `${head}***@${domain}`;
}

export function AuthDebugPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthDebugEnabled()) return;

    const supabase = createClient();
    const { data: u, error: uErr } = await supabase.auth.getUser();
    const allDoc = cookieNamesFromDocument();
    const { supabaseAuthCookieCount, supabaseAuthCookieNames } =
      authCookieNamesForLog(allDoc);

    const next: Snapshot = {
      userId: u.user?.id ?? null,
      email: u.user?.email ?? null,
      getUserError: uErr?.message ?? null,
      supabaseApiHost: authSupabaseApiHost(),
      documentCookieNames: supabaseAuthCookieNames,
      updatedAt: new Date().toISOString(),
    };
    setSnap(next);

    authDebug("client.session", {
      path: pathname,
      supabaseApiHost: next.supabaseApiHost,
      hasUser: !!next.userId,
      userId: next.userId,
      email: maskEmail(next.email),
      getUserError: next.getUserError,
      supabaseAuthCookieCount,
      supabaseAuthCookieNames,
    });
  }, [pathname]);

  useEffect(() => {
    if (!isAuthDebugEnabled()) return;

    const supabase = createClient();
    void refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  if (!isAuthDebugEnabled()) return null;

  const summary =
    snap == null
      ? "Loading…"
      : snap.getUserError
        ? `getUser error`
        : snap.userId
          ? "signed in (client)"
          : "no user (client)";

  const cookieLine =
    snap?.documentCookieNames?.length
      ? `${snap.documentCookieNames.length}: ${snap.documentCookieNames.join(", ")}`
      : "0 sb-related cookie names on document";

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-[200] max-w-[min(22rem,calc(100vw-1.5rem))] text-left font-mono text-[11px] leading-snug text-foreground shadow-lg">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 border border-amber-700/50 bg-amber-950/90 px-2 py-1.5 text-amber-100 backdrop-blur-sm hover:bg-amber-950 ${open ? "rounded-t-lg" : "rounded-lg"}`}
      >
        <span className="font-semibold tracking-wide">Auth debug</span>
        <span className="truncate opacity-90">{summary}</span>
        <span className="shrink-0 opacity-75" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div className="space-y-1.5 rounded-b-lg border border-t-0 border-amber-700/50 bg-stone-950/92 px-2.5 py-2 text-amber-50/95 backdrop-blur-sm">
          <p>
            <span className="text-amber-200/80">path</span> {pathname}
          </p>
          <p>
            <span className="text-amber-200/80">supabase host</span>{" "}
            {snap?.supabaseApiHost ?? "—"}
          </p>
          <p>
            <span className="text-amber-200/80">getUser</span>{" "}
            {snap?.getUserError
              ? `error: ${snap.getUserError}`
              : snap?.userId
                ? `id ${snap.userId.slice(0, 8)}…`
                : "null"}
          </p>
          {snap?.email ? (
            <p>
              <span className="text-amber-200/80">email</span> {maskEmail(snap.email)}
            </p>
          ) : null}
          <p className="break-all">
            <span className="text-amber-200/80">cookies (names)</span> {cookieLine}
          </p>
          <p className="border-t border-amber-800/40 pt-1.5 text-amber-100/70">
            If you are signed in here but middleware sends you to /login, the Edge request is not
            seeing the same session (host, cookies, or env mismatch).
          </p>
          {snap?.updatedAt ? (
            <p className="text-[10px] text-amber-200/50">updated {snap.updatedAt}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
