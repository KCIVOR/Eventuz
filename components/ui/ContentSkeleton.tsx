/** Lightweight pulse placeholders using existing `--muted` — avoids layout shift when paired with tab + card shells. */

export function SeatingShellSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading seating">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-[7.5rem] animate-pulse rounded-lg bg-muted/90" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(28,25,23,0.05)]">
        <div className="space-y-3 p-6">
          <div className="h-7 w-52 max-w-full animate-pulse rounded-md bg-muted/90" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-muted/60" />
          <div className="flex gap-2">
            <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted/70" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Route-level placeholder for streamed attendee event pages (matches max-w + card rhythm). */
export function AttendeeRouteSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6"
      role="status"
      aria-label="Loading"
    >
      <div className="h-8 w-48 max-w-full animate-pulse rounded-lg bg-muted/90" />
      <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/50" />
      <div className="h-40 animate-pulse rounded-2xl border border-border/80 bg-card/80" />
      <div className="h-32 animate-pulse rounded-2xl border border-dashed border-border bg-muted/20" />
    </div>
  );
}
