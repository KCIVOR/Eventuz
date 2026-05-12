import React from "react";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { FormPageSkeleton } from "@/components/ui/ContentSkeleton";

export default function OrganizerLoading() {
  return (
    <RoleAreaShell
      role="organizer"
      title="Your events"
      description="Loading your organizer workspace..."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
        <FormPageSkeleton />
      </div>
    </RoleAreaShell>
  );
}
