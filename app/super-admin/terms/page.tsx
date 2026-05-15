import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { TermsSettingsForm } from "@/components/super-admin/TermsSettingsForm";
import { loadTermsSettingsForSuperAdmin } from "@/lib/super-admin/loadTermsSettings";

export default async function SuperAdminTermsPage() {
  const { settings, error } = await loadTermsSettingsForSuperAdmin();

  return (
    <RoleAreaShell
      role="super_admin"
      title="Terms and Conditions"
      description="Account creation terms shown to new users during registration."
      layout="flush"
      mainWidth="wide"
      withoutFrame
      breadcrumbs={[
        { label: "Platform", href: "/super-admin#platform-overview" },
        { label: "Terms and Conditions" },
      ]}
    >
      <TermsSettingsForm initial={settings} loadError={error} />
    </RoleAreaShell>
  );
}
