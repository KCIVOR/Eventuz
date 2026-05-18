import { AuthShell } from "@/components/layout/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { loadActiveTermsForRegistration } from "@/lib/super-admin/loadTermsSettings";

export default async function RegisterPage() {
  const { terms, error } = await loadActiveTermsForRegistration();

  return (
    <AuthShell title="Create account">
      <RegisterForm terms={terms} loadError={error} />

    </AuthShell>
  );
}
