"use client";

import {
  authCookieNamesForLog,
  authDebug,
  authPanelConsole,
  authSupabaseApiHost,
  isAuthDebugEnabled,
} from "@/lib/auth/debug";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const GET_USER_TIMEOUT_MS = 15_000;
/** Failsafe if timers/effects misbehave (background tab throttling, crashed refresh). */
const PANEL_WATCHDOG_MS = 22_000;

type Snapshot = {
  userId: string | null;
  email: string | null;
  getUserError: string | null;
  /** Thrown errors or timeout (never resolves from getUser). */
  loadError: string | null;
  supabaseApiHost: string | null;
  hasSupabaseUrl: boolean;
  hasSupabaseAnonKey: boolean;
  documentCookieNames: string[];
  updatedAt: string;
};

function emptySnapshotBase(): Pick<
  Snapshot,
  "supabaseApiHost" | "hasSupabaseUrl" | "hasSupabaseAnonKey" | "documentCookieNames" | "updatedAt"
> {
  return snapshotFromCookies();
}

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

function snapshotFromCookies(): Pick<
  Snapshot,
  "supabaseApiHost" | "hasSupabaseUrl" | "hasSupabaseAnonKey" | "documentCookieNames" | "updatedAt"
> {
  const allDoc = cookieNamesFromDocument();
  const { supabaseAuthCookieNames } = authCookieNamesForLog(allDoc);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return {
    supabaseApiHost: authSupabaseApiHost(),
    hasSupabaseUrl: !!url,
    hasSupabaseAnonKey: !!key,
    documentCookieNames: supabaseAuthCookieNames,
    updatedAt: new Date().toISOString(),
  };
}

async function getUserWithTimeout(
  supabase: ReturnType<typeof createClient>,
  ms: number
): Promise<Awaited<ReturnType<ReturnType<typeof createClient>["auth"]["getUser"]>>> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () =>
        reject(
          new Error(
            `getUser() did not finish within ${ms / 1000}s (network, extension, or firewall blocking ${authSupabaseApiHost() ?? "Supabase"})`
          )
        ),
      ms
    );
    supabase.auth
      .getUser()
      .then(
        (r) => {
          clearTimeout(t);
          resolve(r);
        },
        (e: unknown) => {
          clearTimeout(t);
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      );
  });
}

function watchdogSnapshot(): Snapshot {
  const cookies = snapshotFromCookies();
  return {
    userId: null,
    email: null,
    getUserError: null,
    loadError:
      "Panel watchdog: still no result after 22s. Often: old Vercel deploy (redeploy), background-tab timer throttling, or a JS error — check Console for red errors from your app (not chrome-extension://).",
    ...cookies,
    updatedAt: new Date().toISOString(),
  };
}

export function AuthDebugPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [fetching, setFetching] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthDebugEnabled()) return;

    setFetching(true);
    const base = emptySnapshotBase();
    const preCookies = authCookieNamesForLog(cookieNamesFromDocument());
    authPanelConsole("refresh_start", {
      path: pathname,
      supabaseApiHost: base.supabaseApiHost,
      hasSupabaseUrl: base.hasSupabaseUrl,
      hasSupabaseAnonKey: base.hasSupabaseAnonKey,
      supabaseAuthCookieCount: preCookies.supabaseAuthCookieCount,
      supabaseAuthCookieNames: preCookies.supabaseAuthCookieNames,
    });

    try {
      const supabase = createClient();
      const { data: u, error: uErr } = await getUserWithTimeout(
        supabase,
        GET_USER_TIMEOUT_MS
      );

      const next: Snapshot = {
        userId: u.user?.id ?? null,
        email: u.user?.email ?? null,
        getUserError: uErr?.message ?? null,
        loadError: null,
        ...base,
        documentCookieNames: authCookieNamesForLog(cookieNamesFromDocument())
          .supabaseAuthCookieNames,
        updatedAt: new Date().toISOString(),
      };
      setSnap(next);

      const { supabaseAuthCookieCount, supabaseAuthCookieNames } = authCookieNamesForLog(
        cookieNamesFromDocument()
      );
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
      authPanelConsole("session_ok", {
        path: pathname,
        supabaseApiHost: next.supabaseApiHost,
        hasUser: !!next.userId,
        userId: next.userId,
        email: maskEmail(next.email),
        getUserError: next.getUserError,
        supabaseAuthCookieCount,
        supabaseAuthCookieNames,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const cookies = snapshotFromCookies();
      const next: Snapshot = {
        userId: null,
        email: null,
        getUserError: null,
        loadError: msg,
        ...cookies,
        updatedAt: new Date().toISOString(),
      };
      setSnap(next);
      authDebug("client.session.error", {
        path: pathname,
        loadError: msg,
        ...cookies,
      });
      authPanelConsole("session_error", {
        path: pathname,
        loadError: msg,
        supabaseApiHost: cookies.supabaseApiHost,
        hasSupabaseUrl: cookies.hasSupabaseUrl,
        hasSupabaseAnonKey: cookies.hasSupabaseAnonKey,
        supabaseAuthCookieNames: cookies.documentCookieNames,
      });
    } finally {
      authPanelConsole("refresh_finally", { path: pathname });
      setFetching(false);
    }
  }, [pathname]);

  /** Start session check as early as possible after hydration (before paint batch). */
  useLayoutEffect(() => {
    if (!isAuthDebugEnabled()) return;
    authPanelConsole("hydrate", {
      path: pathname,
      nodeEnv: process.env.NODE_ENV,
      nextPublicAuthDebug: process.env.NEXT_PUBLIC_AUTH_DEBUG ?? "(unset)",
    });
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    if (!isAuthDebugEnabled()) return;

    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    if (!isAuthDebugEnabled()) return;
    const w = window.setTimeout(() => {
      setFetching(false);
      setSnap((prev) => {
        if (prev != null) return prev;
        const next = watchdogSnapshot();
        const docCookies = authCookieNamesForLog(cookieNamesFromDocument());
        authPanelConsole("watchdog_fallback", {
          path: pathname,
          ms: PANEL_WATCHDOG_MS,
          ...docCookies,
        });
        return next;
      });
    }, PANEL_WATCHDOG_MS);
    return () => window.clearTimeout(w);
  }, [pathname]);

  if (!isAuthDebugEnabled()) return null;

  const summary = fetching
    ? "Checking session…"
    : snap == null
      ? "No data (see panel)"
      : snap.loadError
        ? "refresh failed"
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
          <p className="text-amber-100/80">
            <span className="text-amber-200/80">Vercel tip</span>{" "}
            <code className="rounded bg-amber-950/80 px-1">NEXT_PUBLIC_*</code> is baked in at{" "}
            <code className="rounded bg-amber-950/80 px-1">next build</code>. Set{" "}
            <code className="rounded bg-amber-950/80 px-1">NEXT_PUBLIC_AUTH_DEBUG</code> in the
            project env, then redeploy.
          </p>
          <p>
            <span className="text-amber-200/80">path</span> {pathname}
          </p>
          <p>
            <span className="text-amber-200/80">NEXT_PUBLIC env</span>
            {snap
              ? ` url=${snap.hasSupabaseUrl ? "ok" : "MISSING"} anon=${snap.hasSupabaseAnonKey ? "ok" : "MISSING"}`
              : fetching
                ? " …"
                : ` url=${process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "MISSING"} anon=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "MISSING"}`}
          </p>
          <p>
            <span className="text-amber-200/80">supabase host</span>{" "}
            {snap?.supabaseApiHost ?? authSupabaseApiHost() ?? "—"}
          </p>
          {snap?.loadError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/15 px-2 py-1 text-destructive">
              <span className="text-amber-200/80">blocked / error</span> {snap.loadError}
            </p>
          ) : null}
          <p>
            <span className="text-amber-200/80">getUser</span>{" "}
            {snap?.getUserError
              ? `error: ${snap.getUserError}`
              : snap?.userId
                ? `id ${snap.userId.slice(0, 8)}…`
                : snap && !fetching
                  ? "null"
                  : "…"}
          </p>
          {snap?.email ? (
            <p>
              <span className="text-amber-200/80">email</span> {maskEmail(snap.email)}
            </p>
          ) : null}
          <p className="break-all">
            <span className="text-amber-200/80">cookies (names)</span> {cookieLine}
          </p>
          <button
            type="button"
            onClick={() => {
              authPanelConsole("retry_click", { path: pathname });
              void refresh();
            }}
            className="mt-1 rounded border border-amber-600/50 bg-amber-900/40 px-2 py-1 text-amber-100 hover:bg-amber-900/70"
          >
            Retry getUser
          </button>
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
