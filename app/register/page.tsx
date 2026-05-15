import { AuthShell } from "@/components/layout/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { loadActiveTermsForRegistration } from "@/lib/super-admin/loadTermsSettings";

function safeNextForLoginLink(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/login") || raw.startsWith("/register")) return null;
  return raw;
}

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const q = await searchParams;
  const next = safeNextForLoginLink(q.next);
  const backHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const { terms, error } = await loadActiveTermsForRegistration();

  return (
    <AuthShell title="Create account" backHref={backHref} backLabel="Back to log in">
      <RegisterForm terms={terms} loadError={error} />
      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        New accounts default to <strong className="text-foreground">attendee</strong>. Promote
        organizers and super admins in Supabase SQL (see migration file comments).
      </p>
    </AuthShell>
  );
}
