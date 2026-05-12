import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

type Props = {
  rows?: number;
  columns?: number;
};

export function DashboardTableSkeleton({ rows = 5, columns = 6 }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/80 last:border-b-0">
              {[...Array(columns)].map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-4">
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
