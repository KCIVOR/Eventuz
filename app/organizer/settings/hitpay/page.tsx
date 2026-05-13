import { HitPaySettingsForm } from "@/components/organizer/HitPaySettingsForm";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadHitPaySettingsFull } from "@/lib/hitpay/settings";

export default async function OrganizerHitPayPage() {
  // Pass no ID: it will use the current user's ID
  const settings = await loadHitPaySettingsFull();

  return (
    <RoleAreaShell
      role="organizer"
      title="Payment Integration"
      description="Connect your HitPay account to start selling tickets for your events."
      layout="panel"
      mainWidth="wide"
      breadcrumbs={[
        { label: "Dashboard", href: "/organizer" },
        { label: "Settings" },
        { label: "Payment" },
      ]}
    >
      <HitPaySettingsForm initial={settings} loadError={null} />
    </RoleAreaShell>
  );
}
