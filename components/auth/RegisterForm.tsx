"use client";

import {
  registerAccountAction,
  type RegisterActionState,
} from "@/app/register/actions";
import type { ActiveTermsForRegistration } from "@/lib/super-admin/loadTermsSettings";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useState } from "react";

const inputClass =
  "rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

type Props = {
  terms: ActiveTermsForRegistration | null;
  loadError: string | null;
};

function RegisterFormInner({ terms, loadError }: Props) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "";
  const safeNext =
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//") &&
    !nextParam.startsWith("/login") &&
    !nextParam.startsWith("/register")
      ? nextParam
      : "/attendee/event";

  const [state, action, pending] = useActionState(
    registerAccountAction,
    {} as RegisterActionState
  );
  const [termsOpen, setTermsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const disabled = pending || !terms || Boolean(loadError);

  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={safeNext} />
        {terms ? (
          <>
            <input type="hidden" name="terms_id" value={terms.id} />
            <input type="hidden" name="terms_version" value={terms.version} />
          </>
        ) : null}

        {loadError ? (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-center text-sm text-warning">
            {loadError}
          </p>
        ) : null}
        {!terms && !loadError ? (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-center text-sm text-warning">
            Account creation is temporarily unavailable because Terms and Conditions are not configured.
          </p>
        ) : null}
        {state.ok || state.error ? (
          <p
            className={`rounded-lg px-3 py-2 text-center text-sm ${
              state.error
                ? "border border-destructive/20 bg-destructive-muted text-destructive"
                : "border border-success/20 bg-success-muted text-success"
            }`}
          >
            {state.error ?? state.ok}
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
            disabled={disabled}
            className={inputClass}
            placeholder="John Doe"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={disabled}
            className={inputClass}
            placeholder="john@example.com"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone_number" className={labelClass}>
              Phone number
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              autoComplete="tel"
              required
              disabled={disabled}
              className={inputClass}
              placeholder="+63 9xx xxx xxxx"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="birthday" className={labelClass}>
              Birthday
            </label>
            <input
              id="birthday"
              name="birthday"
              type="date"
              required
              disabled={disabled}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              disabled={disabled}
              className={`${inputClass} w-full pr-10`}
              placeholder="Min. 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary focus:outline-none disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="organization_name" className={labelClass}>
            Organization / Company
          </label>
          <input
            id="organization_name"
            name="organization_name"
            type="text"
            required
            disabled={disabled}
            className={inputClass}
            placeholder="Eternal Affair Events"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="address" className={labelClass}>
            Complete Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            required
            disabled={disabled}
            className={inputClass}
            placeholder="St. Street, City, Province"
          />
        </div>

        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <input
              name="terms_accepted"
              type="checkbox"
              required
              disabled={disabled}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span>
              I agree to the{" "}
              <button
                type="button"
                disabled={!terms}
                onClick={() => setTermsOpen(true)}
                className="font-semibold text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
              >
                Terms and Conditions
              </button>
              .
            </span>
          </label>
          {terms ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Version {terms.version}. Review before creating your account.
            </p>
          ) : null}
        </section>

        <button
          type="submit"
          disabled={disabled}
          className="mt-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create account"}
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

      {termsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="presentation"
          onMouseDown={() => setTermsOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-dialog-title"
            className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 id="terms-dialog-title" className="font-serif text-xl font-semibold text-foreground">
                  Terms and Conditions
                </h2>
                {terms ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Version {terms.version}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-muted-foreground">
              {terms?.content ?? "Terms and Conditions are not available yet."}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function RegisterForm(props: Props) {
  return (
    <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading...</p>}>
      <RegisterFormInner {...props} />
    </Suspense>
  );
}
