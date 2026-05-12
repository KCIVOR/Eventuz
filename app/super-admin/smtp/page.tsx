import { SmtpSettingsForm } from "@/components/super-admin/SmtpSettingsForm";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadSmtpSettingsPublic } from "@/lib/super-admin/loadSmtpSettings";

export default async function SuperAdminSmtpPage() {
  const { settings, error } = await loadSmtpSettingsPublic();

  return (
    <RoleAreaShell
      role="super_admin"
      title="SMTP settings"
      description="Outbound mail for tickets and staff invitations."
      layout="flush"
      mainWidth="wide"
      withoutFrame
      breadcrumbs={[
        { label: "Platform", href: "/super-admin#platform-overview" },
        { label: "SMTP settings" },
      ]}
    >
      <SmtpSettingsForm initial={settings} loadError={error} />
    </RoleAreaShell>
  );
}
