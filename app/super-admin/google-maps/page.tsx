import { GoogleMapsSettingsForm } from "@/components/super-admin/GoogleMapsSettingsForm";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadGoogleMapsSettingsPublic } from "@/lib/super-admin/loadGoogleMapsSettings";

export default async function SuperAdminGoogleMapsPage() {
  const { settings, error } = await loadGoogleMapsSettingsPublic();

  return (
    <RoleAreaShell
      role="super_admin"
      title="Google Maps settings"
      description="Venue search, map tagging, and attendee map previews."
      layout="flush"
      mainWidth="wide"
      withoutFrame
      breadcrumbs={[
        { label: "Platform", href: "/super-admin#platform-overview" },
        { label: "Google Maps settings" },
      ]}
    >
      <GoogleMapsSettingsForm initial={settings} loadError={error} />
    </RoleAreaShell>
  );
}
