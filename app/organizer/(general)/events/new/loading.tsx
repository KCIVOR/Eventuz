import React from "react";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { FormPageSkeleton } from "@/components/ui/ContentSkeleton";

export default function NewEventLoading() {
  return (
    <RoleAreaShell
      role="organizer"
      title="New event"
      description="Preparing your workspace..."
      layout="flush"
      mainWidth="wide"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8">
        <FormPageSkeleton />
      </div>
    </RoleAreaShell>
  );
}
