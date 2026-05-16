import { acceptStaffInviteFormAction, setupStaffAccountAndAcceptAction } from "@/app/staff/invite/accept/actions";
import { PublicShell } from "@/components/layout/PublicShell";
import { loadStaffInviteByRawToken } from "@/lib/staff/loadStaffInvite";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
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
          <div className="pt-4 border-t border-border">
            <Link href="/login" className="text-xs font-semibold uppercase tracking-widest text-accent-gold hover:text-accent-gold-dark transition-colors">
              Return to Sign in
            </Link>
          </div>
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
        eyebrow="Staff Access"
        title="Accept staff invitation"
        description="Staff invitations grant scanner access for this event only. Please ensure you use the correct account."
      >
        {err ? (
          <Alert type="error" title="Access Error" className="mb-6">
            {err}
          </Alert>
        ) : null}

        {!invite.found ? (
          <Alert type="error" title="Invitation Not Found">
            This invitation link is invalid or has been replaced. Ask the organizer to send a fresh invitation.
          </Alert>
        ) : invite.status !== "pending" ? (
          <Alert 
            type={invite.status === "accepted" ? "info" : "warning"} 
            title={invite.status === "accepted" ? "Invitation Used" : "Invitation Unavailable"}
          >
            {invite.status === "accepted"
              ? "This invitation has already been accepted and linked to an account."
              : invite.status === "revoked"
                ? "This invitation was revoked by the organizer."
                : "This invitation has expired. Ask the organizer to resend it."}
          </Alert>
        ) : user && !emailMatches ? (
          <div className="space-y-6">
            <Alert type="warning" title="Account Mismatch">
              You are signed in as <span className="font-medium">{user.email}</span>, but this
              invitation was sent to <span className="font-medium">{invite.maskedEmail}</span>.
            </Alert>
            <Button
              asChild
              variant="primary"
              className="w-full"
            >
              <Link
                href={`/auth/sign-out?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent("Sign in with the invited staff email to accept this invitation.")}`}
              >
                Switch Account
              </Link>
            </Button>
          </div>
        ) : user && emailMatches ? (
          <form action={acceptStaffInviteFormAction} className="flex flex-col gap-6">
            <input type="hidden" name="token" value={token} />
            <div className="inset-panel text-sm text-charcoal">
              <p>
                Signed in as <span className="font-medium text-foreground">{user.email}</span>.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">This matches the invited staff email address.</p>
            </div>
            <Button type="submit" variant="gold" className="w-full">
              Accept Invitation
            </Button>
          </form>
        ) : (
          <form action={setupStaffAccountAndAcceptAction} className="flex flex-col gap-6">
            <input type="hidden" name="token" value={token} />
            <div className="inset-panel text-sm text-charcoal mb-2">
              <p>
                Complete your account setup for <span className="font-medium text-foreground">{invite.maskedEmail}</span>.
              </p>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="label-eventuz">Full Name</label>
              <input
                name="full_name"
                type="text"
                required
                placeholder="Your full name"
                className="input-eventuz"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label-eventuz">Create Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="input-eventuz"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label-eventuz">Confirm Password</label>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="input-eventuz"
              />
            </div>

            <Button type="submit" variant="primary" className="mt-2 w-full">
              Set Password & Accept
            </Button>

            <p className="text-center text-xs text-muted-foreground font-light">
              Already have an account?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                className="font-medium text-accent-gold hover:underline underline-offset-4"
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
    <div className="mx-auto w-full max-w-xl">
      <div className="panel-card p-10 sm:p-14 shadow-xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="section-title mt-3">{title}</h1>
        <p className="mt-4 text-[15px] font-light leading-relaxed text-warm-gray">{description}</p>
        <div className="mt-10">{children}</div>
      </div>
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
