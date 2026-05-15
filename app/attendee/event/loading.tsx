import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { AttendeeRouteSkeleton } from "@/components/ui/ContentSkeleton";

/** Streaming fallback for attendee event routes — shell is preserved to prevent blank page flashes */
export default function AttendeeEventLoading() {
  return (
    <RoleAreaShell
      role="attendee"
      title="My Event"
      showPageHeader={false}
      compactTitle="Eventuz"
      layout="flush"
      mainWidth="wide"
    >
      <div className="min-h-[50vh] pt-10" role="status" aria-live="polite">
        <AttendeeRouteSkeleton />
      </div>
    </RoleAreaShell>
  );
}
