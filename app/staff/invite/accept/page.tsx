import { acceptStaffInviteFormAction, setupStaffAccountAndAcceptAction } from "@/app/staff/invite/accept/actions";
import { PublicShell } from "@/components/layout/PublicShell";
import { loadStaffInviteByRawToken } from "@/lib/staff/loadStaffInvite";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { ReactNode } from "react";

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
        <InviteCard
          eyebrow="Staff invitation"
          title="Invalid link"
          description="This invitation link is missing details. Ask the organizer to send the invite again."
        >
          <Link href="/login" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </InviteCard>
      </PublicShell>
    );
  }

  const invite = await loadStaffInviteByRawToken(token);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nextPath = `/staff/invite/accept?token=${encodeURIComponent(token)}`;
  const userEmail = (user?.email ?? "").trim().toLowerCase();
  const invitedEmail = invite.found ? invite.email : "";
  const emailMatches = Boolean(user && invitedEmail && userEmail === invitedEmail);

  return (
    <PublicShell>
      <InviteCard
        eyebrow="Eventuz"
        title="Accept staff invitation"
        description="Staff invitations grant scanner access only. Use the same email address the organizer invited."
      >
        {err ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {err}
          </p>
        ) : null}

        {!invite.found ? (
          <TerminalState
            title="Invitation not found"
            body="This invitation link is invalid or has been replaced. Ask the organizer to send a fresh invitation."
          />
        ) : invite.status !== "pending" ? (
          <TerminalState
            title={invite.status === "expired" ? "Invitation expired" : "Invitation unavailable"}
            body={
              invite.status === "accepted"
                ? "This invitation has already been accepted."
                : invite.status === "revoked"
                  ? "This invitation was revoked by the organizer."
                  : "This invitation expired. Ask the organizer to resend it."
            }
          />
        ) : user && !emailMatches ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-sm">
              <p className="font-semibold text-foreground">Switch account to accept this invite</p>
              <p className="mt-2 text-muted-foreground">
                You are signed in as <span className="font-medium text-foreground">{user.email}</span>, but this
                invitation was sent to <span className="font-medium text-foreground">{invite.maskedEmail}</span>.
              </p>
            </div>
            <Link
              href={`/auth/sign-out?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent("Sign in with the invited staff email to accept this invitation.")}`}
              prefetch={false}
              className="block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Switch account
            </Link>
          </div>
        ) : user && emailMatches ? (
          <form action={acceptStaffInviteFormAction} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
              <p>
                Signed in as <span className="font-medium text-foreground">{user.email ?? "this account"}</span>.
              </p>
              <p className="mt-1">This matches the invited staff email.</p>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Accept invitation
            </button>
          </form>
        ) : (
          <form action={setupStaffAccountAndAcceptAction} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
              <p>
                Complete your account setup for <span className="font-medium text-foreground">{invite.maskedEmail}</span>.
              </p>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full Name
              </label>
              <input
                name="full_name"
                type="text"
                required
                placeholder="John Doe"
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Create Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Confirm Password
              </label>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              className="mt-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Set password & Accept invitation
            </button>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Sign in instead
              </Link>
            </p>
          </form>
        )}
      </InviteCard>
    </PublicShell>
  );
}

function InviteCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-8 space-y-5">{children}</div>
    </div>
  );
}

function TerminalState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
