import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { ScannerSkeleton } from "@/components/ui/ContentSkeleton";

export default function StaffScannerLoading() {
  return (
    <RoleAreaShell role="staff" title="Scanner" layout="flush" withoutFrame>
      <div className="mx-auto w-full max-w-lg px-0 pt-10 sm:px-2">
        <ScannerSkeleton />
      </div>
    </RoleAreaShell>
  );
}

