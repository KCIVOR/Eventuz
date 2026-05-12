import { HitPaySettingsForm } from "@/components/super-admin/HitPaySettingsForm";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadHitPaySettingsPublic } from "@/lib/super-admin/loadHitPaySettings";

export default async function SuperAdminHitPayPage() {
  const { settings, error } = await loadHitPaySettingsPublic();

  return (
    <RoleAreaShell
      role="super_admin"
      title="HitPay settings"
      description="Configure payment processing for ticket checkouts."
      layout="flush"
      mainWidth="wide"
      withoutFrame
      breadcrumbs={[
        { label: "Platform", href: "/super-admin#platform-overview" },
        { label: "HitPay settings" },
      ]}
    >
      <HitPaySettingsForm initial={settings} loadError={error} />
    </RoleAreaShell>
  );
}
