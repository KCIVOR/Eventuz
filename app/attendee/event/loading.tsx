import { AttendeeRouteSkeleton } from "@/components/ui/ContentSkeleton";

/** Streaming fallback for attendee event routes — skeleton approximates final layout to limit shift */
export default function AttendeeEventLoading() {
  return (
    <div className="min-h-[50vh]" role="status" aria-live="polite">
      <AttendeeRouteSkeleton />
    </div>
  );
}
