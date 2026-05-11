import {
  superAdminSetEventRegistrationBlockedAction,
  superAdminSetUserAccountStatusAction,
} from "@/app/super-admin/actions";
import { EventStatusChip, ProfileAccountStatusChip, RoleStatusChip } from "@/components/super-admin/AdminStatusChip";
import { PlatformMetricGrid } from "@/components/super-admin/PlatformMetricGrid";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadRecentAuditLogs } from "@/lib/super-admin/loadRecentAuditLogs";
import { loadPlatformOverview } from "@/lib/super-admin/loadPlatformOverview";
import { ListPagination } from "@/components/ui/ListPagination";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { formatPhp } from "@/lib/utils/money";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function firstQuery(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function shortId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

const btnSecondary =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

const btnDanger =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-destructive/40 bg-destructive-muted px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const selfId = user?.id ?? "";

  const organizers = profiles.filter((p) => p.role === "organizer");
  const suspendedProfiles = profiles.filter((p) => (p.status ?? "active") === "disabled");
  const suspendedEvents = events.filter((e) => e.status === "disabled");

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
      description="Monitor users, events, delivery, and audit activity across Eventuz."
      layout="flush"
      mainWidth="wide"
    >
      <div className="space-y-10 text-sm leading-relaxed">
        {firstQuery(q.error) ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-destructive">
            {safeDecode(firstQuery(q.error)!)}
          </p>
        ) : null}
        {firstQuery(q.ok) ? (
          <p className="rounded-xl border border-success/30 bg-success-muted px-4 py-3 text-success">
            {firstQuery(q.ok) === "user"
              ? "User account status updated."
              : firstQuery(q.ok) === "event"
                ? "Event registration status updated."
                : "Saved."}
          </p>
        ) : null}

        <div
          id="platform-overview"
          className="rounded-2xl border border-border/90 bg-card px-5 py-6 shadow-[0_2px_12px_rgba(28,25,23,0.05)] sm:px-8"
        >
          <p className="text-foreground">
            Monitor users, events, and delivery. You can suspend accounts and block new registrations for
            an event. You cannot change organizer event copy, ticket types, seats, orders, or payments from
            here—those stay with the organizer tools and checkout webhooks.
          </p>
          <p className="mt-3 text-muted-foreground">
            <Link
              href="/super-admin/smtp"
              className="font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
            >
              SMTP settings
            </Link>{" "}
            · Outbound mail for tickets and staff invites.
          </p>
          {smtp ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-xs">
              <span
                className={`rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide ${
                  smtp.isActive
                    ? "border-success/35 bg-success-muted text-success"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {smtp.isActive ? "SMTP active" : "SMTP inactive"}
              </span>
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{smtp.host}</span>
                <span className="mx-2 text-border">·</span>
                {smtp.fromEmail}
              </span>
              {smtp.lastTestError ? (
                <span className="text-destructive">Last test error: {smtp.lastTestError}</span>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-xs text-warning">No SMTP row configured yet.</p>
          )}
          {loadError ? (
            <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              Partial data: {loadError}
            </p>
          ) : null}
        </div>

        <section
          className="space-y-4"
          id="platform-metrics"
          aria-labelledby="metrics-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
            <h2 id="metrics-heading" className="font-serif text-xl font-semibold text-foreground">
              Platform totals
            </h2>
            <p className="text-xs text-muted-foreground">
              Staff {counts.staff} · Super admins {counts.superAdmins} · Orders {counts.ordersTotal} ·
              Expired {counts.ordersExpired} · Seats {counts.seatsTotal} · Ticket types{" "}
              {counts.ticketTypesTotal}
            </p>
          </div>
          <PlatformMetricGrid counts={counts} revenueLabel={formatPhp(revenuePhp)} />
        </section>

        <section className="space-y-3 scroll-mt-28" id="suspended-quick-view" aria-labelledby="suspended-heading">
          <h2 id="suspended-heading" className="font-serif text-xl font-semibold text-foreground">
            Suspended (quick view)
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Disabled users ({suspendedProfiles.length})
              </p>
              {suspendedProfiles.length === 0 ? (
                <p className="mt-3 text-muted-foreground">None in the loaded window.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-foreground">
                  {suspendedProfilesPage.slice.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2 text-xs">
                      <span className="font-medium">{p.full_name || shortId(p.id)}</span>
                      <span className="text-muted-foreground">{p.email ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
              {suspendedProfiles.length > 0 ? (
                <ListPagination
                  pathname={PATH}
                  searchParams={q}
                  paramKey="lp_su"
                  page={suspendedProfilesPage.page}
                  pageSize={DEFAULT_LIST_PAGE_SIZE}
                  total={suspendedProfilesPage.total}
                  pageCount={suspendedProfilesPage.pageCount}
                  rangeStart={suspendedProfilesPage.rangeStart}
                  rangeEnd={suspendedProfilesPage.rangeEnd}
                  listLabel="Suspended users"
                />
              ) : null}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Disabled events ({suspendedEvents.length})
              </p>
              {suspendedEvents.length === 0 ? (
                <p className="mt-3 text-muted-foreground">None in the loaded window.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-foreground">
                  {suspendedEventsPage.slice.map((e) => (
                    <li key={e.id} className="text-xs font-medium">
                      {e.name}{" "}
                      <span className="font-normal text-muted-foreground">({e.public_slug})</span>
                    </li>
                  ))}
                </ul>
              )}
              {suspendedEvents.length > 0 ? (
                <ListPagination
                  pathname={PATH}
                  searchParams={q}
                  paramKey="lp_se"
                  page={suspendedEventsPage.page}
                  pageSize={DEFAULT_LIST_PAGE_SIZE}
                  total={suspendedEventsPage.total}
                  pageCount={suspendedEventsPage.pageCount}
                  rangeStart={suspendedEventsPage.rangeStart}
                  rangeEnd={suspendedEventsPage.rangeEnd}
                  listLabel="Suspended events"
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-3 scroll-mt-28" id="all-users" aria-labelledby="profiles-heading">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
            <h2 id="profiles-heading" className="font-serif text-xl font-semibold text-foreground">
              All users
            </h2>
            <p className="text-xs text-muted-foreground">
              Loaded {profilesPage.total} profile{profilesPage.total === 1 ? "" : "s"} (max 500)
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(28,25,23,0.04)]">
            <table className="w-full min-w-[800px] text-left text-sm">
              <caption className="sr-only">Platform user profiles</caption>
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 font-semibold">
                    User ID
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Role
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Account
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Created
                  </th>
                  <th scope="col" className="p-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {profilesPage.slice.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border transition-colors duration-150 hover:bg-muted/25 motion-reduce:transition-none"
                  >
                    <td className="p-3 font-mono text-xs text-muted-foreground">{shortId(p.id)}</td>
                    <td className="p-3 font-medium">{p.full_name || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="p-3">
                      <RoleStatusChip role={p.role} />
                    </td>
                    <td className="p-3">
                      <ProfileAccountStatusChip status={p.status ?? "active"} />
                    </td>
                    <td className="p-3 tabular-nums text-muted-foreground">{p.created_at?.slice(0, 10) ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {p.id === selfId ? (
                          <span className="text-xs text-muted-foreground">You</span>
                        ) : (p.status ?? "active") === "disabled" ? (
                          <form action={superAdminSetUserAccountStatusAction}>
                            <input type="hidden" name="user_id" value={p.id} />
                            <input type="hidden" name="status" value="active" />
                            <button type="submit" className={btnSecondary}>
                              Re-enable
                            </button>
                          </form>
                        ) : (
                          <form action={superAdminSetUserAccountStatusAction}>
                            <input type="hidden" name="user_id" value={p.id} />
                            <input type="hidden" name="status" value="disabled" />
                            <button type="submit" className={btnDanger}>
                              Disable
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!profiles.length ? (
              <p className="border-t border-border p-6 text-center text-muted-foreground">No profiles yet.</p>
            ) : null}
            {profiles.length > 0 ? (
              <ListPagination
                pathname={PATH}
                searchParams={q}
                paramKey="lp_pr"
                page={profilesPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={profilesPage.total}
                pageCount={profilesPage.pageCount}
                rangeStart={profilesPage.rangeStart}
                rangeEnd={profilesPage.rangeEnd}
                listLabel="All users"
              />
            ) : null}
          </div>
        </section>

        <section className="space-y-3 scroll-mt-28" id="organizers" aria-labelledby="organizers-heading">
          <h2 id="organizers-heading" className="font-serif text-xl font-semibold text-foreground">
            Organizers
          </h2>
          <p className="text-xs text-muted-foreground">{organizers.length} accounts with organizer role</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(28,25,23,0.04)]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3">
                    Name
                  </th>
                  <th scope="col" className="p-3">
                    Email
                  </th>
                  <th scope="col" className="p-3">
                    Account
                  </th>
                  <th scope="col" className="p-3">
                    User ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {organizersPage.slice.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium">{p.full_name || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="p-3">
                      <ProfileAccountStatusChip status={p.status ?? "active"} />
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{shortId(p.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!organizers.length ? (
              <p className="border-t border-border p-6 text-center text-muted-foreground">No organizers yet.</p>
            ) : null}
            {organizers.length > 0 ? (
              <ListPagination
                pathname={PATH}
                searchParams={q}
                paramKey="lp_or"
                page={organizersPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={organizersPage.total}
                pageCount={organizersPage.pageCount}
                rangeStart={organizersPage.rangeStart}
                rangeEnd={organizersPage.rangeEnd}
                listLabel="Organizers"
              />
            ) : null}
          </div>
        </section>

        <section className="space-y-3 scroll-mt-28" id="all-events" aria-labelledby="events-heading">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
            <h2 id="events-heading" className="font-serif text-xl font-semibold text-foreground">
              All events
            </h2>
            <p className="text-xs text-muted-foreground">
              Loaded {eventsPage.total} event{eventsPage.total === 1 ? "" : "s"} (max 500)
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Suspend</strong> sets status to <code className="rounded bg-muted px-1">disabled</code> — same as organizer “disabled”; attendees only see{" "}
            <code className="rounded bg-muted px-1">published</code> events, so new purchases stop.{" "}
            <strong className="text-foreground">Restore draft</strong> moves the event back to{" "}
            <code className="rounded bg-muted px-1">draft</code> so the organizer can review and publish again.
            Check-in is blocked while disabled.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(28,25,23,0.04)]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <caption className="sr-only">Events on the platform</caption>
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Slug
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="p-3 font-semibold">
                    Organizer
                  </th>
                  <th scope="col" className="p-3 font-semibold text-right">
                    Registration
                  </th>
                </tr>
              </thead>
              <tbody>
                {eventsPage.slice.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-border transition-colors duration-150 hover:bg-muted/25 motion-reduce:transition-none"
                  >
                    <td className="p-3 font-medium text-foreground">{e.name}</td>
                    <td className="p-3 text-muted-foreground">{e.public_slug}</td>
                    <td className="p-3">
                      <EventStatusChip status={e.status} />
                    </td>
                    <td className="p-3 tabular-nums text-muted-foreground">{e.event_date}</td>
                    <td className="p-3 text-foreground">
                      {organizerNameById[e.organizer_id] ?? shortId(e.organizer_id)}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {e.status === "disabled" ? (
                          <form action={superAdminSetEventRegistrationBlockedAction}>
                            <input type="hidden" name="event_id" value={e.id} />
                            <input type="hidden" name="blocked" value="false" />
                            <button type="submit" className={btnSecondary}>
                              Restore draft
                            </button>
                          </form>
                        ) : (
                          <form action={superAdminSetEventRegistrationBlockedAction}>
                            <input type="hidden" name="event_id" value={e.id} />
                            <input type="hidden" name="blocked" value="true" />
                            <button type="submit" className={btnDanger}>
                              Suspend
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!events.length ? (
              <p className="border-t border-border p-6 text-center text-muted-foreground">No events yet.</p>
            ) : null}
            {events.length > 0 ? (
              <ListPagination
                pathname={PATH}
                searchParams={q}
                paramKey="lp_ev"
                page={eventsPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={eventsPage.total}
                pageCount={eventsPage.pageCount}
                rangeStart={eventsPage.rangeStart}
                rangeEnd={eventsPage.rangeEnd}
                listLabel="All events"
              />
            ) : null}
          </div>
        </section>

        <section className="space-y-3 scroll-mt-28" id="audit-log" aria-labelledby="audit-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="audit-heading" className="font-serif text-xl font-semibold text-foreground">
              Audit log
            </h2>
            <p className="text-xs text-muted-foreground">
              Critical actions · loaded {auditPage.total} entr{auditPage.total === 1 ? "y" : "ies"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Trace payments, check-ins, staff changes, and platform controls. Metadata excludes secrets and raw
            QR payloads.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border/90 bg-card shadow-[0_2px_12px_rgba(28,25,23,0.05)]">
            <table className="min-w-[720px] w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/25 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditPage.slice.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {fmtAuditTime(row.created_at)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-foreground">{row.action}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.entity_type}
                      {row.entity_id ? (
                        <>
                          <span className="text-border"> · </span>
                          <span className="font-mono text-foreground">{shortId(row.entity_id)}</span>
                        </>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.actor_user_id ? (
                        <span className="font-mono text-foreground">{shortId(row.actor_user_id)}</span>
                      ) : (
                        <span className="italic">system</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!auditRows.length ? (
              <p className="border-t border-border p-6 text-center text-muted-foreground">No audit entries yet.</p>
            ) : null}
            {auditRows.length > 0 ? (
              <ListPagination
                pathname={PATH}
                searchParams={q}
                paramKey="lp_au"
                page={auditPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={auditPage.total}
                pageCount={auditPage.pageCount}
                rangeStart={auditPage.rangeStart}
                rangeEnd={auditPage.rangeEnd}
                listLabel="Audit log"
              />
            ) : null}
          </div>
        </section>
      </div>
    </RoleAreaShell>
  );
}

function fmtAuditTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
