import { PublicShell } from "@/components/layout/PublicShell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { acceptStaffInviteFormAction } from "./actions";

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function StaffInviteAcceptPage({ searchParams }: Props) {
  const q = await searchParams;
  const token = typeof q.token === "string" ? q.token.trim() : "";
  const errRaw = typeof q.error === "string" ? q.error : "";
  const err = errRaw ? decodeURIComponentSafe(errRaw) : "";

  if (!token) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-serif text-2xl font-semibold text-foreground">Invalid link</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This invitation link is missing details. Ask the organizer to send the invite again.
          </p>
          <p className="mt-6">
            <Link
              href="/login"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </PublicShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nextPath = `/staff/invite/accept?token=${encodeURIComponent(token)}`;

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Eventuz
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground">
          Accept staff invitation
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You’ll get scanner access for this event after you accept. Use the same email address the
          invitation was sent to.
        </p>

        {err ? (
          <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {err}
          </p>
        ) : null}

        {user ? (
          <form action={acceptStaffInviteFormAction} className="mt-8 flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{user.email ?? "this account"}</span>.
            </p>
            <button
              type="submit"
              className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Accept invitation
            </button>
          </form>
        ) : (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Sign in to accept
            </Link>
            <Link
              href={`/register?next=${encodeURIComponent(nextPath)}`}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </PublicShell>
  );
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
