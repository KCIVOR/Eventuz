import {
  inviteEventStaff,
  resendStaffInvitation,
  revokeEventStaffMember,
  revokeStaffInvitation,
} from "@/app/organizer/events/staffActions";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<SerializableSearchParams>;
};

type StaffInvitationRow = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_user_id: string | null;
};

type EventStaffRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
};

function decodeParam(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function inviteDisplayStatus(invite: StaffInvitationRow, nowMs: number): "pending" | "expired" | "accepted" | "revoked" {
  if (invite.status === "pending" && new Date(invite.expires_at).getTime() <= nowMs) return "expired";
  if (invite.status === "accepted") return "accepted";
  if (invite.status === "revoked") return "revoked";
  return "pending";
}

function okMessage(ok: unknown): string {
  const value = Array.isArray(ok) ? ok[0] : ok;
  switch (value) {
    case "invited":
      return "Invitation sent. The staff member can accept it from their email.";
    case "resent":
      return "Invitation refreshed and resent. The previous link is no longer valid.";
    case "revoked":
      return "Access has been revoked.";
    case "1":
      return "Update successful. Access permissions have been synchronized.";
    default:
      return "";
  }
}

async function loadServerNowMs(): Promise<number> {
  return Date.now();
}

export default async function OrganizerEventStaffPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const q = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) notFound();
  if (!user || event.organizer_id !== user.id) notFound();

  const { data: staffInvites } = await supabase
    .from("staff_invitations")
    .select("id, email, status, expires_at, created_at, accepted_user_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const { data: eventStaffRows } = await supabase
    .from("event_staff")
    .select("id, user_id, role, status, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const rawStaffRows = (eventStaffRows ?? []) as Array<Omit<EventStaffRow, "profile">>;
  const staffUserIds = [...new Set(rawStaffRows.map((row) => row.user_id).filter(Boolean))];
  const { data: staffProfiles } =
    staffUserIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", staffUserIds)
      : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> };
  const profileById = new Map(
    ((staffProfiles ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).map((profile) => [
      profile.id,
      { full_name: profile.full_name, email: profile.email },
    ])
  );
  const staffRows: EventStaffRow[] = rawStaffRows.map((row) => ({
    ...row,
    profile: profileById.get(row.user_id) ?? null,
  }));
  const inviteRows = ((staffInvites ?? []) as StaffInvitationRow[]);
  const nowMs = await loadServerNowMs();

  const activeStaff = staffRows.filter((row) => row.status === "active");
  const revokedStaff = staffRows.filter((row) => row.status === "revoked");
  const pendingInvites = inviteRows.filter((row) => inviteDisplayStatus(row, nowMs) === "pending");
  const expiredInvites = inviteRows.filter((row) => inviteDisplayStatus(row, nowMs) === "expired");
  const acceptedInvites = inviteRows.filter((row) => inviteDisplayStatus(row, nowMs) === "accepted");
  const revokedInvites = inviteRows.filter((row) => inviteDisplayStatus(row, nowMs) === "revoked");
  const ok = okMessage(q.ok);
  const errorMessage = decodeParam(q.error);

  return (
    <RoleAreaShell
      role="organizer"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      withoutFrame
      title="Staff Management"
      description={`Invite and manage scanner access for ${event.name as string}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name as string, href: `/organizer/events/${eventId}` },
        { label: "Staff Management" },
      ]}
      actions={
        <Button variant="outline" className="btn-eventuz-secondary py-2" asChild>
          <Link href={`/organizer/events/${eventId}/scan`}>Preview Scanner</Link>
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 sm:px-8">
        {errorMessage ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive-muted px-6 py-4 text-sm text-destructive shadow-sm">
            {errorMessage}
          </p>
        ) : null}
        {ok ? (
          <p className="rounded-xl border border-success/25 bg-success-muted px-6 py-4 text-sm text-success shadow-sm">
            {ok}
          </p>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Staff access summary">
          <SummaryCard label="Active staff" value={activeStaff.length} tone="success" />
          <SummaryCard label="Pending invites" value={pendingInvites.length} tone="warning" />
          <SummaryCard label="Expired invites" value={expiredInvites.length} tone="muted" />
          <SummaryCard label="Revoked access" value={revokedStaff.length + revokedInvites.length} tone="danger" />
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-start">
          <div className="space-y-8">
            <section className="panel-card overflow-hidden p-0">
              <SectionHeader
                eyebrow="Current access"
                title="Active scanner team"
                description="These staff members can open the staff scanner for this event."
              />
              <div className="divide-y divide-border/60">
                {activeStaff.length === 0 ? (
                  <EmptyState label="No active staff yet." />
                ) : (
                  activeStaff.map((row) => <ActiveStaffItem key={row.id} row={row} eventId={eventId} />)
                )}
              </div>
            </section>

            <section className="panel-card overflow-hidden p-0">
              <SectionHeader
                eyebrow="Invitation pipeline"
                title="Staff invitations"
                description="Pending and expired invitations can be resent with a fresh secure link."
              />
              <InvitationGroup
                title="Pending"
                emptyLabel="No pending invitations."
                rows={pendingInvites}
                eventId={eventId}
                nowMs={nowMs}
                allowResend
                allowRevoke
              />
              <InvitationGroup
                title="Expired"
                emptyLabel="No expired invitations."
                rows={expiredInvites}
                eventId={eventId}
                nowMs={nowMs}
                allowResend
                allowRevoke
              />
              <InvitationGroup
                title="Accepted"
                emptyLabel="No accepted invitation history yet."
                rows={acceptedInvites}
                eventId={eventId}
                nowMs={nowMs}
              />
              <InvitationGroup
                title="Revoked"
                emptyLabel="No revoked invitations."
                rows={revokedInvites}
                eventId={eventId}
                nowMs={nowMs}
              />
            </section>

            {revokedStaff.length > 0 ? (
              <section className="panel-card overflow-hidden p-0">
                <SectionHeader
                  eyebrow="Past access"
                  title="Revoked staff"
                  description="Revoked staff must receive a new email invitation before they can scan again."
                />
                <div className="divide-y divide-border/60">
                  {revokedStaff.map((row) => <RevokedStaffItem key={row.id} row={row} />)}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6 xl:sticky xl:top-28">
            <section className="panel-card border-accent-gold/20 bg-accent-gold/[0.02] p-8 shadow-lg shadow-accent-gold/[0.03]">
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold">New staff</p>
                <h2 className="font-serif text-2xl font-light text-foreground">Invite by email</h2>
                <p className="text-xs font-light leading-relaxed text-muted-foreground">
                  Staff must accept the invitation using this email address before scanner access is granted.
                </p>
              </div>
              <form action={inviteEventStaff.bind(null, eventId)} className="space-y-5">
                <Input
                  id="staff-invite-email"
                  label="Email address"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="colleague@venue.com"
                  className="bg-card"
                />
                <Button type="submit" className="w-full btn-eventuz-gold py-4 shadow-lg shadow-accent-gold/10">
                  Send Invitation Link
                </Button>
              </form>
            </section>

            <section className="panel-card p-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Scanner role</h2>
              <div className="mt-5 space-y-5 text-sm">
                <GuidanceItem
                  index={1}
                  title="Check-in only"
                  body="Staff can validate ticket QR codes for this event. They do not receive organizer settings or ticket inventory access."
                />
                <GuidanceItem
                  index={2}
                  title="Secure acceptance"
                  body="Every invite uses a unique link and must be accepted by an account with the invited email."
                />
                <GuidanceItem
                  index={3}
                  title="Recover by invite"
                  body="Revoked staff are restored by sending a new invitation, keeping the access history clear."
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </RoleAreaShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "muted" | "danger";
}) {
  const toneClass = {
    success: "border-success/30 bg-success-muted text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    muted: "border-border bg-muted/30 text-muted-foreground",
    danger: "border-destructive/25 bg-destructive-muted text-destructive",
  }[tone];

  return (
    <div className={`rounded-2xl border px-5 py-5 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 font-serif text-4xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="border-b border-border/60 px-6 py-6 sm:px-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold">{eyebrow}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-serif text-2xl font-light text-foreground">{title}</h2>
        <p className="max-w-lg text-xs font-light leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </header>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="px-6 py-10 text-center sm:px-8">
      <p className="text-sm font-light italic text-muted-foreground">{label}</p>
    </div>
  );
}

function ActiveStaffItem({ row, eventId }: { row: EventStaffRow; eventId: string }) {
  const profile = row.profile;
  const displayName = profile?.full_name?.trim() || profile?.email || "Staff member";

  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-medium text-foreground">{displayName}</p>
          <StatusBadge status={row.status} />
        </div>
        <p className="text-xs font-light text-muted-foreground">
          {profile?.email ?? "Email unavailable"} · Role: {row.role || "scanner"} · Assigned {formatDateTime(row.created_at)}
        </p>
      </div>
      <form action={revokeEventStaffMember}>
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="event_staff_id" value={row.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/5">
          Revoke Access
        </Button>
      </form>
    </div>
  );
}

function RevokedStaffItem({ row }: { row: EventStaffRow }) {
  const profile = row.profile;
  return (
    <div className="px-6 py-4 sm:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{profile?.full_name?.trim() || profile?.email || "Staff member"}</p>
        <StatusBadge status="revoked" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {profile?.email ?? "Email unavailable"} · Revoked access remains in history.
      </p>
    </div>
  );
}

function InvitationGroup({
  title,
  emptyLabel,
  rows,
  eventId,
  nowMs,
  allowResend = false,
  allowRevoke = false,
}: {
  title: string;
  emptyLabel: string;
  rows: StaffInvitationRow[];
  eventId: string;
  nowMs: number;
  allowResend?: boolean;
  allowRevoke?: boolean;
}) {
  return (
    <section className="border-b border-border/60 last:border-b-0">
      <div className="bg-muted/20 px-6 py-3 sm:px-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <InvitationItem
              key={row.id}
              row={row}
              eventId={eventId}
              nowMs={nowMs}
              allowResend={allowResend}
              allowRevoke={allowRevoke}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InvitationItem({
  row,
  eventId,
  nowMs,
  allowResend,
  allowRevoke,
}: {
  row: StaffInvitationRow;
  eventId: string;
  nowMs: number;
  allowResend: boolean;
  allowRevoke: boolean;
}) {
  const displayStatus = inviteDisplayStatus(row, nowMs);

  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-all text-sm font-medium text-foreground">{row.email}</p>
          <StatusBadge status={displayStatus} />
        </div>
        <p className="text-xs font-light text-muted-foreground">
          Created {formatDateTime(row.created_at)} · Expires {formatDateTime(row.expires_at)}
        </p>
      </div>
      {(allowResend || allowRevoke) && (
        <div className="flex flex-wrap gap-2">
          {allowResend ? (
            <form action={resendStaffInvitation}>
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="invitation_id" value={row.id} />
              <Button type="submit" variant="outline" size="sm" className="text-xs">
                Resend
              </Button>
            </form>
          ) : null}
          {allowRevoke ? (
            <form action={revokeStaffInvitation}>
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="invitation_id" value={row.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/5">
                Revoke
              </Button>
            </form>
          ) : null}
        </div>
      )}
    </div>
  );
}

function GuidanceItem({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-gold/10">
        <span className="text-[10px] font-bold text-accent-gold">{index}</span>
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs font-light leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
