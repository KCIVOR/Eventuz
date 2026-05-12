import React from "react";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { DashboardMetricsGridSkeleton } from "@/components/organizer/DashboardMetricsGridSkeleton";
import { DashboardTableSkeleton } from "@/components/organizer/DashboardTableSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrganizerDashboardLoading() {
  return (
    <RoleAreaShell
      role="organizer"
      title="Loading dashboard..."
      description="We're gathering the latest metrics and data for your event."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      <div className="space-y-10">
        {/* Overview Header Skeleton */}
        <div className="rounded-2xl border border-border/90 bg-card px-5 py-6 shadow-sm sm:px-8">
          <Skeleton className="h-4 w-3/4 mb-3" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Metrics Grid Skeleton */}
        <section className="space-y-4">
          <Skeleton className="h-6 w-48 mb-4" />
          <DashboardMetricsGridSkeleton />
        </section>

        {/* Tables Skeletons */}
        <section className="space-y-4">
          <Skeleton className="h-6 w-40 mb-4" />
          <DashboardTableSkeleton rows={3} columns={5} />
        </section>

        <section className="space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <DashboardTableSkeleton rows={5} columns={8} />
        </section>
      </div>
    </RoleAreaShell>
  );
}
