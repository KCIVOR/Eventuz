import {
  superAdminSetEventRegistrationBlockedAction,
  superAdminSetUserAccountStatusAction,
} from "@/app/super-admin/actions";
import { PlatformMetricGrid } from "@/components/super-admin/PlatformMetricGrid";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadRecentAuditLogs } from "@/lib/super-admin/loadRecentAuditLogs";
import { loadPlatformOverview } from "@/lib/super-admin/loadPlatformOverview";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { formatPhp } from "@/lib/utils/money";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// Decomposed components
import { SuperAdminAuditLog } from "@/components/super-admin/SuperAdminAuditLog";
import { SuperAdminUsersTable } from "@/components/super-admin/SuperAdminUsersTable";
import { SuperAdminEventsTable } from "@/components/super-admin/SuperAdminEventsTable";

type Props = { searchParams: Promise<SerializableSearchParams> };

const PATH = "/super-admin";

export default async function SuperAdminHomePage({ searchParams }: Props) {
  const q = await searchParams;
  const [overview, auditRows] = await Promise.all([loadPlatformOverview(), loadRecentAuditLogs()]);

  const pgSu = parsePageParam(q.lp_su);
  const pgSe = parsePageParam(q.lp_se);
  const pgPr = parsePageParam(q.lp_pr);
  const pgOr = parsePageParam(q.lp_or);
  const pgEv = parsePageParam(q.lp_ev);
  const pgAu = parsePageParam(q.lp_au);
  
  const { counts, revenuePhp, profiles, events, organizerNameById, smtp, loadError } = overview;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const selfId = user?.id ?? "";

  const organizers = profiles.filter((p) => p.role === "organizer");
  const suspendedProfiles = profiles.filter((p) => (p.status ?? "active") === "disabled");
  const suspendedEvents = events.filter((e) => e.status === "disabled");

  // Pagination slicing
  const suspendedProfilesPage = slicePage(suspendedProfiles, pgSu, DEFAULT_LIST_PAGE_SIZE);
  const suspendedEventsPage = slicePage(suspendedEvents, pgSe, DEFAULT_LIST_PAGE_SIZE);
  const profilesPage = slicePage(profiles, pgPr, DEFAULT_LIST_PAGE_SIZE);
  const organizersPage = slicePage(organizers, pgOr, DEFAULT_LIST_PAGE_SIZE);
  const eventsPage = slicePage(events, pgEv, DEFAULT_LIST_PAGE_SIZE);
  const auditPage = slicePage(auditRows, pgAu, DEFAULT_LIST_PAGE_SIZE);

  return (
    <RoleAreaShell
      role="super_admin"
      title="Platform control center"
      description="Overall metrics, audit logs, and user management."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      <div className="space-y-10 text-sm leading-relaxed">
        {/* Error/Success Messages */}
        {q.error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-destructive">
            {safeDecode(Array.isArray(q.error) ? q.error[0] : q.error)}
          </p>
        )}
        {q.ok && (
          <p className="rounded-xl border border-success/30 bg-success-muted px-4 py-3 text-success">
            {q.ok === "user" ? "User account status updated." : q.ok === "event" ? "Event registration status updated." : "Saved."}
          </p>
        )}

        {/* Platform Overview Header */}
        <div className="rounded-2xl border border-border/90 bg-card px-5 py-6 shadow-[0_2px_12px_rgba(28,25,23,0.05)] sm:px-8">
          <p className="text-foreground">
            Monitor users, events, and delivery. You can suspend accounts and block new registrations for
            an event.
          </p>
          <p className="mt-3 text-muted-foreground">
            <Link href="/super-admin/smtp" className="font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline">
              SMTP settings
            </Link>{" "}
            · Outbound mail for tickets and staff invites.
          </p>

          <div className="mt-5 flex flex-wrap gap-4">
            {smtp && (
              <div className="flex flex-1 min-w-[200px] flex-col gap-2 rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground uppercase tracking-tight opacity-70">SMTP Gateway</span>
                  <span className={`rounded-full border px-2 py-0.5 font-bold uppercase tracking-wide text-[10px] ${smtp.isActive ? "border-success/35 bg-success-muted text-success" : "border-border bg-muted text-muted-foreground"}`}>
                    {smtp.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-muted-foreground truncate">
                  <span className="font-medium text-foreground">{smtp.host}</span>
                  <span className="mx-2 text-border">·</span>
                  {smtp.fromEmail}
                </div>
              </div>
            )}

          </div>
          {loadError && (
            <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              Partial data: {loadError}
            </p>
          )}
        </div>

        {/* Platform Metrics */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-serif text-xl font-semibold text-foreground">Platform totals</h2>
            <p className="text-xs text-muted-foreground">
              Staff {counts.staff} · Orders {counts.ordersTotal} · Expired {counts.ordersExpired}
            </p>
          </div>
          <PlatformMetricGrid counts={counts} revenueLabel={formatPhp(revenuePhp)} />
        </section>

        {/* Suspended Quick View */}
        {(suspendedProfiles.length > 0 || suspendedEvents.length > 0) && (
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-semibold text-foreground">Suspended (quick view)</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <SuperAdminUsersTable 
                profiles={suspendedProfiles} 
                pageData={suspendedProfilesPage} 
                pathname={PATH} 
                searchParams={q} 
                selfId={selfId} 
                paramKey="lp_su" 
                listLabel="Suspended users" 
                showRole={false} 
                showCreated={false} 
              />
              <SuperAdminEventsTable 
                events={suspendedEvents} 
                pageData={suspendedEventsPage} 
                pathname={PATH} 
                searchParams={q} 
                organizerNameById={organizerNameById} 
                paramKey="lp_se" 
                listLabel="Suspended events" 
              />
            </div>
          </section>
        )}

        {/* Audit Log (Minimal Preview or Link) */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-serif text-xl font-semibold text-foreground">Recent Audit Activity</h2>
            <Link href="/super-admin/audit" className="text-xs text-primary hover:underline">View full log &rarr;</Link>
          </div>
          <SuperAdminAuditLog 
            auditRows={auditRows.slice(0, 5)} 
            pageData={{ ...auditPage, slice: auditRows.slice(0, 5), total: auditRows.length }} 
            pathname={PATH} 
            searchParams={q} 
          />
        </section>
      </div>
    </RoleAreaShell>
  );
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}
