import { AuthShell } from "@/components/layout/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell title="Create account">
      <RegisterForm />
      <p className="mt-4 text-center text-xs text-zinc-500">
        New accounts default to <strong>attendee</strong>. Promote organizers and super admins in
        Supabase SQL (see migration file comments).
      </p>
    </AuthShell>
  );
}
