"use client";

import { authDebug } from "@/lib/auth/debug";
import { safeNextPathForRole } from "@/lib/auth/redirects";
import type { EventuzRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const errRaw = searchParams.get("error");
  const errDec = errRaw ? safeDecode(errRaw) : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(errDec);
  const [msgIsError, setMsgIsError] = useState(!!errDec);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setMsgIsError(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMsgIsError(true);
      setMessage(error.message);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      router.replace("/");
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", uid)
      .single();
    authDebug("login.profile", {
      userId: uid,
      ok: !profileError && !!profile?.role,
      role: profile?.role ?? null,
      status: profile?.status ?? null,
      error: profileError
        ? {
            message: profileError.message,
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint,
          }
        : null,
    });
    if (!profile?.role) {
      setMsgIsError(true);
      setMessage("Profile missing. Complete Supabase migration and try again.");
      await supabase.auth.signOut();
      return;
    }
    if (profile.status === "disabled") {
      setMsgIsError(true);
      setMessage("This account has been disabled.");
      await supabase.auth.signOut();
      return;
    }
    const role = profile.role as EventuzRole;
    const dest = safeNextPathForRole(next, role);
    router.replace(dest);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-center text-sm ${
            msgIsError
              ? "border border-destructive/20 bg-destructive-muted text-destructive"
              : "border border-success/20 bg-success-muted text-success"
          }`}
        >
          {message}
        </p>
      ) : null}
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
