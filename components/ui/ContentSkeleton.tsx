/** 
 * Lightweight placeholders using existing tokens. 
 * Includes a subtle shimmer effect for a premium feel.
 */

const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent";

export function SeatingShellSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading seating">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-10 w-[7.5rem] rounded-lg bg-muted/90 ${shimmer}`} />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(28,25,23,0.05)]">
        <div className="space-y-3 p-6">
          <div className={`h-7 w-52 max-w-full rounded-md bg-muted/90 ${shimmer}`} />
          <div className={`h-40 w-full rounded-xl bg-muted/60 ${shimmer}`} />
          <div className="flex gap-2">
            <div className={`h-9 flex-1 rounded-lg bg-muted/70 ${shimmer}`} />
            <div className={`h-9 w-24 rounded-lg bg-muted/70 ${shimmer}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Route-level placeholder for streamed attendee event pages. */
export function AttendeeRouteSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-1 pb-12"
      role="status"
      aria-label="Loading"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className={`aspect-[21/9] w-full bg-muted/40 ${shimmer}`} />
        <div className="space-y-4 px-6 py-10 sm:px-10">
          <div className={`mx-auto h-4 w-24 rounded bg-muted/60 ${shimmer}`} />
          <div className={`mx-auto h-10 w-3/4 rounded-lg bg-muted/90 ${shimmer}`} />
          <div className={`mx-auto h-4 w-1/2 rounded bg-muted/50 ${shimmer}`} />
        </div>
      </div>
      <div className={`h-32 rounded-2xl border border-border/90 bg-card ${shimmer}`} />
      <div className={`h-64 rounded-2xl border border-dashed border-border bg-muted/10 ${shimmer}`} />
    </div>
  );
}

/** Generic form/setup page skeleton. */
export function FormPageSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading setup">
      <div className="space-y-4">
        <div className={`h-8 w-64 rounded-lg bg-muted/90 ${shimmer}`} />
        <div className={`h-4 w-full max-w-prose rounded bg-muted/50 ${shimmer}`} />
      </div>
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-48 rounded-2xl border border-border bg-card ${shimmer}`} />
        ))}
      </div>
    </div>
  );
}

/** Scanner page skeleton. */
export function ScannerSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-6" role="status" aria-label="Initializing scanner">
      <div className="aspect-square w-full rounded-2xl border border-border bg-muted/30 flex items-center justify-center">
        <div className={`h-48 w-48 rounded-full bg-muted/40 ${shimmer}`} />
      </div>
      <div className="space-y-3">
        <div className={`mx-auto h-10 w-full rounded-xl bg-muted/90 ${shimmer}`} />
        <div className={`mx-auto h-4 w-32 rounded bg-muted/50 ${shimmer}`} />
      </div>
    </div>
  );
}
