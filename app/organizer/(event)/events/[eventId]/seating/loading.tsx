import React from "react";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { SeatingShellSkeleton } from "@/components/ui/ContentSkeleton";

export default function OrganizerSeatingLoading() {
  return (
    <RoleAreaShell
      role="organizer"
      title="Seating"
      description="Loading table layouts and inventory..."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8">
        <SeatingShellSkeleton />
      </div>
    </RoleAreaShell>
  );
}
