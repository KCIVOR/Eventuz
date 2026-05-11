"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const inputClass =
  "rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

function RegisterFormInner() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "";
  const safeNext =
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//") &&
    !nextParam.startsWith("/login") &&
    !nextParam.startsWith("/register")
      ? nextParam
      : "/attendee/event";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    const supabase = createClient();
    const nextQuery = encodeURIComponent(safeNext);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextQuery}`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      setIsError(true);
      setMessage(error.message);
      return;
    }
    setMessage(
      "Check your email to confirm your account (if confirmation is enabled in Supabase), then sign in."
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {message ? (
          <p
            className={`rounded-lg px-3 py-2 text-center text-sm ${
              isError
                ? "border border-destructive/20 bg-destructive-muted text-destructive"
                : "border border-success/20 bg-success-muted text-success"
            }`}
          >
            {message}
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className={labelClass}>
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={safeNext !== "/attendee/event" ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

export function RegisterForm() {
  return (
    <Suspense
      fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}
    >
      <RegisterFormInner />
    </Suspense>
  );
}
