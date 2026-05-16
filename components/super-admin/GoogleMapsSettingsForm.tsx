"use client";

import {
  saveGoogleMapsSettingsAction,
  type GoogleMapsActionState,
} from "@/app/super-admin/google-maps/actions";
import type { GoogleMapsSettingsPublic } from "@/lib/super-admin/loadGoogleMapsSettings";
import Link from "next/link";
import { useActionState } from "react";

type Props = {
  initial: GoogleMapsSettingsPublic | null;
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

export function GoogleMapsSettingsForm({ initial, loadError }: Props) {
  const [saveState, saveAction, savePending] = useActionState(saveGoogleMapsSettingsAction, {} as GoogleMapsActionState);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <nav>
        <Link
          href="/super-admin"
          className="text-sm font-medium text-primary underline-offset-4 transition-colors duration-200 hover:text-primary-hover hover:underline motion-reduce:transition-none"
        >
          &lt;- Platform overview
        </Link>
      </nav>

      {loadError ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
          {loadError}
        </p>
      ) : null}

      {saveState.ok || saveState.error ? (
        <div className={flashClass(saveState.ok, saveState.error)!}>
          {saveState.error ? <p>{saveState.error}</p> : null}
          {saveState.ok ? <p>{saveState.ok}</p> : null}
        </div>
      ) : null}

      <section
        className="rounded-2xl border border-border bg-card p-6 shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition-shadow duration-200 motion-reduce:transition-none sm:p-8"
        aria-labelledby="google-maps-status-heading"
      >
        <h2 id="google-maps-status-heading" className="font-serif text-lg font-semibold text-foreground">
          Maps status
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-border/80 py-2">
            <dt className="text-muted-foreground">API key stored</dt>
            <dd className="text-foreground">{initial?.keySaved ? "Yes (encrypted)" : "Not yet"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/80 py-2">
            <dt className="text-muted-foreground">Configuration</dt>
            <dd className="text-foreground">{initial?.is_active ? "Active" : "Inactive"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/80 py-2">
            <dt className="text-muted-foreground">Last saved</dt>
            <dd className="text-right text-foreground">
              {initial?.updated_at ? `${initial.updated_at.slice(0, 19).replace("T", " ")} UTC` : "Never"}
            </dd>
          </div>
        </dl>
      </section>

      <form action={saveAction} className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">Google Maps browser key</h2>

        <div className="space-y-1">
          <label htmlFor="google-maps-api-key" className="text-xs font-medium text-muted-foreground">
            API key
          </label>
          <input
            id="google-maps-api-key"
            name="api_key"
            type="password"
            autoComplete="new-password"
            placeholder={initial?.keySaved ? "Leave blank to keep existing key" : "Required"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <p className="text-xs text-muted-foreground">
            Stored encrypted in Supabase. Browser map keys are still visible to visitors when maps load.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="google-maps-active"
            name="is_active"
            type="checkbox"
            defaultChecked={initial?.is_active ?? true}
            className="h-4 w-4 cursor-pointer rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <label htmlFor="google-maps-active" className="cursor-pointer text-sm text-foreground">
            Use for venue search and attendee map previews
          </label>
        </div>

        <button
          type="submit"
          disabled={savePending}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-200 motion-reduce:transition-none hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          {savePending ? "Saving..." : "Save settings"}
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-card p-6 text-sm sm:p-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">Google Cloud setup</h2>
        <p className="mt-2 text-muted-foreground">
          Enable Maps JavaScript API, Places API (New), Geocoding API, and Maps Embed API for this key.
        </p>
        <p className="mt-3 text-muted-foreground">
          Restrict it by HTTP referrer, for example <span className="font-mono text-foreground">http://localhost:3000/*</span>{" "}
          and your production domain.
        </p>
      </section>


    </div>
  );
}
