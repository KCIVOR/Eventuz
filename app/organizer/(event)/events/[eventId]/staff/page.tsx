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
      title="Staff Access"
      description={`Manage team members and scanner invitations for: ${event.name as string}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name as string, href: `/organizer/events/${eventId}` },
        { label: "Staff Access" },
      ]}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 sm:px-8">
        
        {/* Status Messaging */}
        {(q.error || q.ok) && (
          <div className="animate-fade-in-up">
            {q.error && (
              <p className="rounded-xl border border-destructive/25 bg-destructive-muted px-6 py-4 text-sm text-destructive shadow-sm">
                {q.error}
              </p>
            )}
            {q.ok && (
              <p className="rounded-xl border border-success/25 bg-success-muted px-6 py-4 text-sm text-success shadow-sm">
                Update successful. Access permissions have been synchronized.
              </p>
            )}
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
          
          {/* MAIN COLUMN: Active Team & History */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Active Staff Registry */}
            <section className="space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-4">
                <h2 className="font-serif text-2xl font-light text-foreground">Active Team</h2>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              
              <div className="panel-card p-0 overflow-hidden">
                <div className="p-8 space-y-6">
                  {(eventStaffRows ?? []).length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm font-light text-muted-foreground italic">No staff members have been linked to this event yet.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {scannersPage.slice.map((es) => {
                        const prof = nestedOne(es.profiles);
                        return (
                          <li key={es.id as string} className="py-6 first:pt-0 last:pb-0 group">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <p className="text-base font-medium text-foreground">
                                  {prof?.full_name?.trim() ? prof.full_name : (prof?.email ?? "Staff Member")}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground font-light">
                                  <StatusBadge status={es.status as string} />
                                  <span className="h-1 w-1 rounded-full bg-border" />
                                  <span className="capitalize">{(es.role as string) ?? "scanner"}</span>
                                  {prof?.email && (
                                    <>
                                      <span className="h-1 w-1 rounded-full bg-border" />
                                      <span>{prof.email}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {es.status === "active" && (
                                <form action={revokeEventStaffMember}>
                                  <input type="hidden" name="event_id" value={eventId} />
                                  <input type="hidden" name="event_staff_id" value={es.id as string} />
                                  <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5 text-[10px] uppercase tracking-widest font-bold">
                                    Revoke Access
                                  </Button>
                                </form>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {(eventStaffRows ?? []).length > 0 && (
                  <div className="bg-muted/30 px-8 py-4 border-t border-border/50">
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
                  </div>
                )}
              </div>
            </section>

            {/* Pending Invitations */}
            <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-4">
                <h2 className="font-serif text-2xl font-light text-foreground">Pending Invitations</h2>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>

              <div className="panel-card p-0 overflow-hidden border-border/40">
                <div className="p-8 space-y-6">
                  {(staffInvites ?? []).length === 0 ? (
                    <div className="py-6 text-center">
                       <p className="text-sm font-light text-muted-foreground italic">No invitations currently pending.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {invitesPage.slice.map((inv) => {
                        const exp = new Date(inv.expires_at as string);
                        const isPast = exp.getTime() < Date.now();
                        const st = inv.status as string;
                        const badgeLabel = st === "pending" && isPast ? "expired" : st;
                        return (
                          <li key={inv.id as string} className="py-5 first:pt-0 last:pb-0">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">{inv.email as string}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-light">
                                  <StatusBadge status={badgeLabel} />
                                  <span className="h-1 w-1 rounded-full bg-border" />
                                  <span>Expires {exp.toLocaleDateString()} at {exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              {st === "pending" && !isPast && (
                                <form action={revokeStaffInvitation}>
                                  <input type="hidden" name="event_id" value={eventId} />
                                  <input type="hidden" name="invitation_id" value={inv.id as string} />
                                  <Button type="submit" variant="outline" size="sm" className="text-xs border-border/60">
                                    Revoke
                                  </Button>
                                </form>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {(staffInvites ?? []).length > 0 && (
                  <div className="bg-muted/30 px-8 py-4 border-t border-border/50">
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
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* SIDEBAR: Actions & Guidance */}
          <aside className="lg:col-span-5 space-y-8 lg:sticky lg:top-32">
            
            {/* Invitation Form */}
            <div className="panel-card p-8 border-accent-gold/20 bg-accent-gold/[0.02] shadow-lg shadow-accent-gold/[0.03]">
              <div className="space-y-2 mb-8">
                <p className="text-[10px] uppercase tracking-widest text-accent-gold font-bold">New Member</p>
                <h3 className="font-serif text-2xl font-light text-foreground">Invite Staff</h3>
              </div>
              
              <form action={inviteEventStaff.bind(null, eventId)} className="space-y-6">
                <div className="space-y-1.5">
                  <label htmlFor="staff-invite-email" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Email Address
                  </label>
                  <Input
                    id="staff-invite-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    placeholder="colleague@venue.com"
                    className="bg-card border-border/60 focus:border-accent-gold/50"
                  />
                </div>
                <Button type="submit" className="w-full btn-eventuz-gold py-4 shadow-lg shadow-accent-gold/10">
                  Send Invitation Link
                </Button>
              </form>
            </div>

            {/* Guidance Panel */}
            <div className="panel-card p-8 space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Role Permissions</h4>
              <ul className="space-y-4">
                <li className="flex gap-4">
                   <div className="h-5 w-5 rounded-full bg-accent-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                     <span className="text-[10px] text-accent-gold font-bold">1</span>
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Check-in Only</p>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">Staff members can only access the scanning interface to validate tickets.</p>
                   </div>
                </li>
                <li className="flex gap-4">
                   <div className="h-5 w-5 rounded-full bg-accent-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                     <span className="text-[10px] text-accent-gold font-bold">2</span>
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Secure Access</p>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">Invitations are unique to each email and require an Eventuz account for secure check-in.</p>
                   </div>
                </li>
              </ul>

              <div className="pt-6 border-t border-border/50">
                <Button variant="outline" className="w-full btn-eventuz-secondary py-3 text-xs" asChild>
                  <Link href={`/organizer/events/${eventId}/scan`}>
                    Preview Scanner Interface
                  </Link>
                </Button>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </RoleAreaShell>
  );
}
