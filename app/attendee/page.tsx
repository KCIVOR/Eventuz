import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { PlaceholderNotice } from "@/components/ui/PlaceholderNotice";

export default function AttendeeHomePage() {
  return (
    <RoleAreaShell role="attendee" title="Attendee area">
      <PlaceholderNotice label="Event view, purchase, seat assignment" />
    </RoleAreaShell>
  );
}
