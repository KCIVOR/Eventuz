"use client";

import { authDebug } from "@/lib/auth/debug";
import { safeNextPathForRole } from "@/lib/auth/redirects";
import type { EventuzRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const errRaw = searchParams.get("error");
  const errDec = errRaw ? safeDecode(errRaw) : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="flex flex-col gap-1.5">
          <label 
            htmlFor="password" 
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#7A6E68",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="input-eventuz w-full pr-10"
              style={{
                borderRadius: "2px",
                border: "1px solid var(--border)",
                background: "var(--surface-alt)",
                padding: "10px 12px",
                fontSize: "14px"
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary focus:outline-none disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-1 flex justify-end">
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
        <Button
          type="submit"
          isLoading={loading}
          className="w-full mt-2"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
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
