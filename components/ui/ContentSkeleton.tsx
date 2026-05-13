/** 
 * Lightweight loading skeletons using DS tokens.
 * Uses champagne shimmer on ivory/alt-surface backgrounds.
 */

// DS shimmer: translucent white sweep over light surface
const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent";

// Shared skeleton block — DS .card bg with light-gray border
const block = (extra: string) =>
  `${shimmer} ${extra}` ;

export function SeatingShellSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading seating">
      {/* Tab bar skeleton */}
      <div className="flex flex-wrap gap-2" style={{ borderBottom: "1px solid #EDE8E3", paddingBottom: "12px" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={block("h-10 w-[7.5rem]")}
            style={{ background: "#F7F4EF", border: "1px solid #EDE8E3", borderRadius: "1px" }}
          />
        ))}
      </div>
      {/* Card skeleton */}
      <div style={{ border: "1px solid #EDE8E3", borderRadius: "2px", background: "#fff" }}>
        <div className="space-y-3 p-6">
          <div className={block("h-7 w-52 max-w-full")} style={{ background: "#F7F4EF", borderRadius: "1px" }} />
          <div className={block("h-40 w-full")} style={{ background: "#F7F4EF", borderRadius: "1px" }} />
          <div className="flex gap-2">
            <div className={block("h-9 flex-1")} style={{ background: "#F7F4EF", borderRadius: "1px" }} />
            <div className={block("h-9 w-24")} style={{ background: "#F7F4EF", borderRadius: "1px" }} />
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
      {/* Hero card skeleton */}
      <div style={{ border: "1px solid #EDE8E3", borderRadius: "2px", background: "#fff", overflow: "hidden" }}>
        <div className={block("aspect-[21/9] w-full")} style={{ background: "#F0E4CC" }} />
        <div className="space-y-4 px-6 py-10 sm:px-10">
          <div className={block("mx-auto h-4 w-24")} style={{ background: "#F7F4EF", borderRadius: "1px" }} />
          <div className={block("mx-auto h-10 w-3/4")} style={{ background: "#EDE8E3", borderRadius: "1px" }} />
          <div className={block("mx-auto h-4 w-1/2")} style={{ background: "#F7F4EF", borderRadius: "1px" }} />
        </div>
      </div>
      <div className={block("h-32")} style={{ border: "1px solid #EDE8E3", borderRadius: "2px", background: "#fff" }} />
      <div className={block("h-64")} style={{ border: "1px dashed #EDE8E3", borderRadius: "2px", background: "#FDFAF4" }} />
    </div>
  );
}

/** Generic form/setup page skeleton. */
export function FormPageSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading setup">
      <div className="space-y-4">
        <div className={block("h-8 w-64")} style={{ background: "#EDE8E3", borderRadius: "1px" }} />
        <div className={block("h-4 w-full max-w-prose")} style={{ background: "#F7F4EF", borderRadius: "1px" }} />
      </div>
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={block("h-48")}
            style={{ border: "1px solid #EDE8E3", borderRadius: "2px", background: "#fff" }}
          />
        ))}
      </div>
    </div>
  );
}

/** Scanner page skeleton. */
export function ScannerSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-6" role="status" aria-label="Initializing scanner">
      <div
        className="aspect-square w-full flex items-center justify-center"
        style={{ border: "1px solid #EDE8E3", borderRadius: "2px", background: "#F7F4EF" }}
      >
        <div
          className={block("h-48 w-48")}
          style={{ borderRadius: "9999px", background: "#EDE8E3" }}
        />
      </div>
      <div className="space-y-3">
        <div className={block("mx-auto h-10 w-full")} style={{ background: "#EDE8E3", borderRadius: "1px" }} />
        <div className={block("mx-auto h-4 w-32")} style={{ background: "#F7F4EF", borderRadius: "1px" }} />
      </div>
    </div>
  );
}
