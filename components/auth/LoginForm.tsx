"use client";

import { authDebug } from "@/lib/auth/debug";
import { safeNextPathForRole } from "@/lib/auth/redirects";
import type { EventuzRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

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
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {message ? (
          <p
            className="px-3 py-2 text-center text-xs border animate-drop-in"
            style={{ 
              background: msgIsError ? "var(--destructive-muted)" : "var(--success-muted)",
              color: msgIsError ? "var(--destructive)" : "var(--success)",
              borderColor: msgIsError ? "rgba(192,83,75,0.1)" : "rgba(42,102,69,0.1)",
              borderRadius: "1px",
              fontFamily: "var(--font-sans)",
              fontWeight: 300
            }}
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
        <div className="relative">
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
          <div className="mt-2 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[10px] font-medium tracking-wide uppercase hover-gold-text"
              style={{ 
                color: "var(--warm-gray)", 
                textDecoration: "none", 
                fontFamily: "var(--font-sans)" 
              }}
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-eventuz-primary mt-2"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center gap-4">
          <span className="h-[1px] flex-1" style={{ background: "var(--border)" }} />
          <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--warm-gray)" }}>or</span>
          <span className="h-[1px] flex-1" style={{ background: "var(--border)" }} />
        </div>
        
        <Link
          href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="btn-eventuz-secondary w-full text-center"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
