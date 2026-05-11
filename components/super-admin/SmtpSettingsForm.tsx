"use client";

import {
  saveSmtpSettingsAction,
  testSmtpSettingsAction,
  type SmtpActionState,
} from "@/app/super-admin/smtp/actions";
import type { SmtpSettingsPublic } from "@/lib/super-admin/loadSmtpSettings";
import Link from "next/link";
import { useActionState, useMemo } from "react";

type Props = {
  initial: SmtpSettingsPublic | null;
  loadError: string | null;
};

function flashClass(ok?: string, err?: string): string | null {
  if (err) {
    return "rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive";
  }
  if (ok) {
    return "rounded-xl border border-success/30 bg-success-muted px-4 py-3 text-sm text-success";
  }
  return null;
}

export function SmtpSettingsForm({ initial, loadError }: Props) {
  const [saveState, saveAction, savePending] = useActionState(saveSmtpSettingsAction, {} as SmtpActionState);
  const [testState, testAction, testPending] = useActionState(testSmtpSettingsAction, {} as SmtpActionState);

  const mergedMessage = useMemo(() => {
    return {
      ok: saveState.ok ?? testState.ok,
      error: saveState.error ?? testState.error,
    };
  }, [saveState, testState]);

  const canTest = Boolean(initial?.id);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <nav>
        <Link
          href="/super-admin"
          className="text-sm font-medium text-primary underline-offset-4 transition-colors duration-200 hover:text-primary-hover hover:underline motion-reduce:transition-none"
        >
          ← Platform overview
        </Link>
      </nav>

      {loadError ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
          {loadError}
        </p>
      ) : null}

      {(mergedMessage.ok || mergedMessage.error) ? (
        <div className={flashClass(mergedMessage.ok, mergedMessage.error)!}>
          {mergedMessage.error ? <p>{mergedMessage.error}</p> : null}
          {mergedMessage.ok ? <p>{mergedMessage.ok}</p> : null}
        </div>
      ) : null}

      <section
        className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition-shadow duration-200 motion-reduce:transition-none sm:p-8"
        aria-labelledby="smtp-status-heading"
      >
        <h2 id="smtp-status-heading" className="font-serif text-lg font-semibold text-foreground">
          Connection status
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-border/80 py-2">
            <dt className="text-muted-foreground">Password stored</dt>
            <dd className="text-foreground">{initial?.passwordSaved ? "Yes (encrypted)" : "Not yet"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/80 py-2">
            <dt className="text-muted-foreground">Last test</dt>
            <dd className="text-right text-foreground">
              {initial?.last_tested_at ? (
                <>
                  {initial.last_tested_at.slice(0, 19).replace("T", " ")} UTC
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {initial.last_test_error ? (
                      <span className="text-destructive">Failed — {initial.last_test_error}</span>
                    ) : (
                      <span className="text-success">Succeeded</span>
                    )}
                  </span>
                </>
              ) : (
                "Never"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <form action={saveAction} className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">SMTP server</h2>

        <div className="space-y-1">
          <label htmlFor="smtp-host" className="text-xs font-medium text-muted-foreground">
            Host
          </label>
          <input
            id="smtp-host"
            name="host"
            required
            autoComplete="off"
            defaultValue={initial?.host ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="smtp-port" className="text-xs font-medium text-muted-foreground">
              Port
            </label>
            <input
              id="smtp-port"
              name="port"
              type="number"
              required
              min={1}
              max={65535}
              defaultValue={initial?.port ?? 587}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="smtp-encryption" className="text-xs font-medium text-muted-foreground">
              Encryption
            </label>
            <select
              id="smtp-encryption"
              name="encryption_type"
              required
              defaultValue={initial?.encryption_type ?? "tls"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <option value="tls">TLS (e.g. port 587)</option>
              <option value="ssl">SSL (e.g. port 465)</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="smtp-username" className="text-xs font-medium text-muted-foreground">
            Username
          </label>
          <input
            id="smtp-username"
            name="username"
            required
            autoComplete="off"
            defaultValue={initial?.username ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="smtp-password" className="text-xs font-medium text-muted-foreground">
            Password
          </label>
          <input
            id="smtp-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={initial?.passwordSaved ? "Leave blank to keep existing password" : "Required"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <p className="text-xs text-muted-foreground">Never shown again after saving — only replaced if you enter a new value.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="smtp-from-email" className="text-xs font-medium text-muted-foreground">
            From email
          </label>
          <input
            id="smtp-from-email"
            name="from_email"
            type="email"
            required
            autoComplete="off"
            defaultValue={initial?.from_email ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="smtp-from-name" className="text-xs font-medium text-muted-foreground">
            From name
          </label>
          <input
            id="smtp-from-name"
            name="from_name"
            required
            autoComplete="off"
            defaultValue={initial?.from_name ?? "Eventuz"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="smtp-active"
            name="is_active"
            type="checkbox"
            defaultChecked={initial?.is_active ?? true}
            className="h-4 w-4 cursor-pointer rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <label htmlFor="smtp-active" className="cursor-pointer text-sm text-foreground">
            Use as active configuration for outbound mail
          </label>
        </div>

        <button
          type="submit"
          disabled={savePending}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-200 motion-reduce:transition-none hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          {savePending ? "Saving…" : "Save settings"}
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">Send test email</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Uses the saved password and server details for this row (active or by ID). Save changes before testing if you
          edited the form.
        </p>
        <form action={testAction} className="mt-4 space-y-4">
          {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
          <div className="space-y-1">
            <label htmlFor="smtp-test-to" className="text-xs font-medium text-muted-foreground">
              Send test to
            </label>
            <input
              id="smtp-test-to"
              name="test_to"
              type="email"
              required
              placeholder="you@example.com"
              disabled={!canTest || testPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!canTest || testPending}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors duration-200 motion-reduce:transition-none hover:border-primary/40 hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            {testPending ? "Sending…" : "Send test"}
          </button>
        </form>
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Set <span className="font-mono text-foreground">SMTP_SETTINGS_ENCRYPTION_KEY</span> in the server environment
        (at least 32 characters) so passwords can be encrypted at rest.
      </p>
    </div>
  );
}
