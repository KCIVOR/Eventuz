import {
  inviteEventStaff,
  revokeEventStaffMember,
  revokeStaffInvitation,
} from "@/app/organizer/events/staffActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ListPagination } from "@/components/ui/ListPagination";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { nestedOne } from "@/lib/supabase/nestedOne";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/Input";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<SerializableSearchParams>;
};

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
    .select("id, user_id, role, status, created_at, profiles ( full_name, email )")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const pgInv = parsePageParam(q.lp_inv);
  const pgStf = parsePageParam(q.lp_stf);
  const invitesPage = slicePage(staffInvites ?? [], pgInv, DEFAULT_LIST_PAGE_SIZE);
  const scannersPage = slicePage(eventStaffRows ?? [], pgStf, DEFAULT_LIST_PAGE_SIZE);
  const staffPagePath = `/organizer/events/${eventId}/staff`;

  return (
    <RoleAreaShell
      role="organizer"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      withoutFrame
      title="Staff access"
      description={`Manage team members and scanner invitations for: ${event.name as string}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name as string, href: `/organizer/events/${eventId}` },
        { label: "Staff access" },
      ]}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10">
        {q.error ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {q.error}
          </p>
        ) : null}
        {q.ok ? (
          <p className="rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm text-success">
            Updated.
          </p>
        ) : null}

        <section className="space-y-6">
          <div>
            <h2 className="section-title">Check-in staff</h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Invite people by email to scan QR tickets at this event. They accept a secure link, use
              the same email to sign in or register, and only get scanner access here—not organizer
              or ticket tools.
            </p>
            <p className="mt-4">
              <Button variant="secondary" asChild>
                <Link href={`/organizer/events/${eventId}/scan`}>
                  Open check-in scanner
                </Link>
              </Button>
            </p>
          </div>

          <div className="panel-card p-6 sm:p-8">
            <form
              action={inviteEventStaff.bind(null, eventId)}
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <Input
                label="Staff email"
                id="staff-invite-email"
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder="staff@venue.com"
              />
              <Button type="submit" className="w-full shrink-0 sm:w-auto">
                Send invite
              </Button>
            </form>
          </div>

          <div className="panel-card p-6 sm:p-8">
            <h3 className="text-sm font-semibold text-foreground">Invitations</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {(staffInvites ?? []).length === 0 ? (
                <li className="text-muted-foreground">No invitations yet.</li>
              ) : (
                invitesPage.slice.map((inv) => {
                  const exp = new Date(inv.expires_at as string);
                  const isPast = exp.getTime() < Date.now();
                  const st = inv.status as string;
                  const badgeLabel = st === "pending" && isPast ? "expired" : st;
                  return (
                    <li
                      key={inv.id as string}
                      className="flex flex-col gap-2 border-b border-border/80 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">{inv.email as string}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <StatusBadge status={badgeLabel} />
                          <span className="mx-2 text-border">·</span>
                          Expires {exp.toLocaleString()}
                        </p>
                      </div>
                      {st === "pending" && !isPast ? (
                        <form action={revokeStaffInvitation}>
                          <input type="hidden" name="event_id" value={eventId} />
                          <input type="hidden" name="invitation_id" value={inv.id as string} />
                          <Button type="submit" variant="secondary" size="sm">
                            Revoke invite
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
            {(staffInvites ?? []).length > 0 ? (
              <ListPagination
                pathname={staffPagePath}
                searchParams={q}
                paramKey="lp_inv"
                page={invitesPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={invitesPage.total}
                pageCount={invitesPage.pageCount}
                rangeStart={invitesPage.rangeStart}
                rangeEnd={invitesPage.rangeEnd}
                listLabel="Staff invitations"
              />
            ) : null}
          </div>

          <div className="panel-card p-6 sm:p-8">
            <h3 className="text-sm font-semibold text-foreground">Scanners on this event</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {(eventStaffRows ?? []).length === 0 ? (
                <li className="text-muted-foreground">No staff linked yet.</li>
              ) : (
                scannersPage.slice.map((es) => {
                  const prof = nestedOne(
                    es.profiles as
                      | { full_name: string; email: string | null }
                      | { full_name: string; email: string | null }[]
                      | null
                  );
                  return (
                    <li
                      key={es.id as string}
                      className="flex flex-col gap-2 border-b border-border/80 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {prof?.full_name?.trim()
                            ? prof.full_name
                            : (prof?.email ?? "Staff member")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <StatusBadge status={es.status as string} />
                          <span className="mx-2 text-border">·</span>
                          {(es.role as string) ?? "scanner"}
                          {prof?.email ? (
                            <>
                              <span className="mx-2 text-border">·</span>
                              {prof.email}
                            </>
                          ) : null}
                        </p>
                      </div>
                      {es.status === "active" ? (
                        <form action={revokeEventStaffMember}>
                          <input type="hidden" name="event_id" value={eventId} />
                          <input type="hidden" name="event_staff_id" value={es.id as string} />
                          <Button type="submit" variant="secondary" size="sm">
                            Revoke access
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
            {(eventStaffRows ?? []).length > 0 ? (
              <ListPagination
                pathname={staffPagePath}
                searchParams={q}
                paramKey="lp_stf"
                page={scannersPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={scannersPage.total}
                pageCount={scannersPage.pageCount}
                rangeStart={scannersPage.rangeStart}
                rangeEnd={scannersPage.rangeEnd}
                listLabel="Scanners on this event"
              />
            ) : null}
          </div>
        </section>
      </div>
    </RoleAreaShell>
  );
}
