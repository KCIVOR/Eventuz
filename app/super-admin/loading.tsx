import React from "react";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { DashboardTableSkeleton } from "@/components/organizer/DashboardTableSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SuperAdminLoading() {
  return (
    <RoleAreaShell
      role="super_admin"
      title="Platform control center"
      description="Gathering platform metrics and activity logs..."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      <div className="space-y-10">
        {/* Header Skeleton */}
        <div className="rounded-2xl border border-border/90 bg-card px-5 py-6 shadow-sm sm:px-8">
          <Skeleton className="h-4 w-full max-w-lg mb-3" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Metrics Grid Skeleton */}
        <section className="space-y-4">
          <div className="flex justify-between border-b pb-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </section>

        {/* Audit Log Skeleton */}
        <section className="space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <DashboardTableSkeleton rows={10} columns={4} />
        </section>
      </div>
    </RoleAreaShell>
  );
}
