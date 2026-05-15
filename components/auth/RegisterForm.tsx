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
            disabled={disabled}
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
            disabled={disabled}
            className={inputClass}
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
