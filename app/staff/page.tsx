import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export default function StaffHomePage() {
  return (
    <RoleAreaShell role="staff" title="Staff area">
      <PlaceholderNotice label="QR scanning and check-in" />
    </RoleAreaShell>
  );
}
