import { createTicketType, updateEvent, updateTicketType } from "@/app/organizer/events/actions";
import {
  inviteEventStaff,
  revokeEventStaffMember,
  revokeStaffInvitation,
} from "@/app/organizer/events/staffActions";
import {
  organizerBtnPrimary,
  organizerBtnSecondary,
  organizerCallout,
  organizerField,
  organizerInset,
  organizerLabel,
  organizerLink,
  organizerPanel,
  organizerSectionTitle,
} from "@/components/organizer/eventSetupStyles";
import { CollapsibleTicketTypeCard } from "@/components/organizer/CollapsibleTicketTypeCard";
import { ListPagination } from "@/components/ui/ListPagination";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { EVENT_STATUSES } from "@/lib/organizer/eventForm";
import { TICKET_TYPE_STATUSES } from "@/lib/organizer/ticketTypeForm";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { formatPhp } from "@/lib/utils/money";
import { nestedOne } from "@/lib/supabase/nestedOne";
import { trimTimeForInput, toDatetimeLocalInput } from "@/lib/utils/date";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<SerializableSearchParams>;
};

export default async function OrganizerEventDetailPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const q = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) notFound();
  if (!user || event.organizer_id !== user.id) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

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
  const eventSetupPath = `/organizer/events/${eventId}`;

  const ticketStatusBadge: Record<string, string> = {
    active: "bg-success-muted text-success",
    inactive: "bg-muted text-muted-foreground",
    sold_out: "bg-warning/15 text-warning",
  };

  const ticketStatusLabels: Record<string, string> = {
    active: "Active — available when the event is published",
    inactive: "Inactive — hidden from registration lists",
    sold_out: "Sold out — shown as unavailable",
  };

  return (
    <RoleAreaShell
      role="organizer"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      title={event.name as string}
      description={`Status: ${event.status as string} · Public slug: ${event.public_slug as string}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name as string },
      ]}
      actions={
        <Link
          href={`/organizer/events/${eventId}/dashboard`}
          className={organizerBtnSecondary}
        >
          Operations dashboard
        </Link>
      }
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10">
        {q.error ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {q.error}
          </p>
        ) : null}
        {q.ok ? (
          <p className="rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm text-success">
            Saved.
          </p>
        ) : null}

        <div className={organizerPanel + " p-6 sm:p-8"}>
          <form action={updateEvent.bind(null, eventId)} className="flex flex-col gap-8">
            <section className="space-y-4">
              <h2 className={organizerSectionTitle}>Basics</h2>
              <LabeledInput label="Event name" name="name" required defaultValue={event.name as string} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className={organizerLabel}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={event.description as string}
                  className={organizerField}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="status" className={organizerLabel}>
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  className={organizerField}
                  defaultValue={event.status as string}
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "draft"
                        ? "Draft — not visible to attendees"
                        : s === "published"
                          ? "Published — visible when registration is enabled"
                          : "Disabled — hidden from registration"}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-8">
              <h2 className={organizerSectionTitle}>Schedule & location</h2>
              <LabeledInput label="Venue" name="venue" defaultValue={event.venue as string} />
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput
                  label="Event date"
                  name="event_date"
                  type="date"
                  required
                  defaultValue={event.event_date as string}
                />
                <LabeledInput
                  label="Event time"
                  name="event_time"
                  type="time"
                  required
                  defaultValue={trimTimeForInput(event.event_time)}
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-8">
              <h2 className={organizerSectionTitle}>Public link</h2>
              <p className="text-sm text-muted-foreground">
                Attendees will use this identifier in the event URL. Lowercase letters, numbers, and
                hyphens work best.
              </p>
              <LabeledInput
                label="Public slug"
                name="public_slug"
                required
                defaultValue={event.public_slug as string}
                autoComplete="off"
              />
            </section>

            <section className="space-y-4 border-t border-border pt-8">
              <h2 className={organizerSectionTitle}>Hold durations (minutes)</h2>
              <p className="text-sm text-muted-foreground">
                Stored on this event. Use whole minutes from 1 to 525600.
              </p>
              <fieldset className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-3">
                <legend className={organizerLabel + " px-1"}>Per-event timing</legend>
                <LabeledInput
                  label="Capacity hold"
                  name="capacity_hold_minutes"
                  type="number"
                  required
                  min={1}
                  defaultValue={String(event.capacity_hold_minutes)}
                />
                <LabeledInput
                  label="Payment hold"
                  name="payment_hold_minutes"
                  type="number"
                  required
                  min={1}
                  defaultValue={String(event.payment_hold_minutes)}
                />
                <LabeledInput
                  label="Early bird price hold"
                  name="early_bird_hold_minutes"
                  type="number"
                  required
                  min={1}
                  defaultValue={String(event.early_bird_hold_minutes)}
                />
              </fieldset>
            </section>

            {event.status === "draft" ? (
              <div className={organizerCallout}>
                <strong className="font-semibold text-foreground">Ready to go live?</strong>
                <p className="mt-1 text-muted-foreground">
                  Change <em>status</em> to <strong>published</strong> above, then save. Add ticket
                  types below before opening registration.
                </p>
              </div>
            ) : null}

            <button type="submit" className={organizerBtnPrimary + " w-full sm:w-auto"}>
              Save changes
            </button>
          </form>
        </div>

        <section className="space-y-6">
          <div>
            <h2 className={organizerSectionTitle}>Ticket types</h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Define inventory, list prices, and optional early-bird windows. Saving updates linked
              seats (manage labels under <strong className="font-medium text-foreground">Seating</strong>{" "}
              → Seat inventory). Checkout and attendee seat picking come later.
            </p>
          </div>

          <div className={organizerCallout}>
            <strong className="font-semibold text-foreground">Validation</strong>
            <p className="mt-1 text-muted-foreground">
              With an early-bird window set, early-bird price must be <em>lower</em> than regular
              price. End must be after start. Quantity is at least 1.
            </p>
          </div>

          <div className={organizerPanel + " p-6 sm:p-8"}>
            <h3 className="text-sm font-semibold text-foreground">Add ticket type</h3>
            <form action={createTicketType.bind(null, eventId)} className="mt-4 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput
                  label="Name"
                  name="name"
                  idPrefix="new-tt"
                  required
                  placeholder="e.g. General admission"
                />
                <LabeledInput
                  label="Quantity"
                  name="quantity"
                  idPrefix="new-tt"
                  type="number"
                  required
                  min={1}
                  defaultValue="1"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-tt-description" className={organizerLabel}>
                  Description
                </label>
                <textarea
                  id="new-tt-description"
                  name="description"
                  rows={2}
                  className={organizerField}
                  placeholder="Optional details for your team."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput
                  label="Regular price (PHP)"
                  name="regular_price"
                  idPrefix="new-tt"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  defaultValue="0"
                />
                <LabeledInput
                  label="Early bird price (PHP)"
                  name="early_bird_price"
                  idPrefix="new-tt"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  defaultValue="0"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput
                  label="Early bird starts"
                  name="early_bird_start_at"
                  idPrefix="new-tt"
                  type="datetime-local"
                />
                <LabeledInput
                  label="Early bird ends"
                  name="early_bird_end_at"
                  idPrefix="new-tt"
                  type="datetime-local"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-tt-status" className={organizerLabel}>
                  Status
                </label>
                <select id="new-tt-status" name="status" className={organizerField} defaultValue="active">
                  {TICKET_TYPE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ticketStatusLabels[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={organizerBtnPrimary + " w-full sm:w-auto"}>
                Add ticket type
              </button>
            </form>
          </div>

          {(ticketTypes ?? []).length > 1 ? (
            <p className="text-xs text-muted-foreground">
              Each ticket type is collapsed to save space. Click the header to expand and edit.
            </p>
          ) : null}

          <ul className="space-y-4">
            {(ticketTypes ?? []).map((tt) => (
              <CollapsibleTicketTypeCard
                key={tt.id as string}
                ticketTypeId={tt.id as string}
                title={tt.name as string}
                summary={`${formatPhp(Number(tt.regular_price))} regular · ${formatPhp(Number(tt.early_bird_price))} early bird · qty ${tt.quantity}`}
                defaultExpanded={(ticketTypes ?? []).length <= 1}
                statusBadge={
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ticketStatusBadge[tt.status as string] ?? ticketStatusBadge.inactive}`}
                  >
                    {tt.status as string}
                  </span>
                }
              >
                <form action={updateTicketType} className="flex flex-col gap-4">
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="ticket_type_id" value={tt.id as string} />
                  <div className={organizerInset + " space-y-4"}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <LabeledInput
                        label="Name"
                        name="name"
                        idPrefix={`tt-${tt.id}`}
                        required
                        defaultValue={tt.name as string}
                      />
                      <LabeledInput
                        label="Quantity"
                        name="quantity"
                        idPrefix={`tt-${tt.id}`}
                        type="number"
                        required
                        min={1}
                        defaultValue={String(tt.quantity)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`tt-${tt.id}-description`} className={organizerLabel}>
                        Description
                      </label>
                      <textarea
                        id={`tt-${tt.id}-description`}
                        name="description"
                        rows={2}
                        defaultValue={tt.description as string}
                        className={organizerField}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <LabeledInput
                        label="Regular price (PHP)"
                        name="regular_price"
                        idPrefix={`tt-${tt.id}`}
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        defaultValue={String(tt.regular_price)}
                      />
                      <LabeledInput
                        label="Early bird price (PHP)"
                        name="early_bird_price"
                        idPrefix={`tt-${tt.id}`}
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        defaultValue={String(tt.early_bird_price)}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <LabeledInput
                        label="Early bird starts"
                        name="early_bird_start_at"
                        idPrefix={`tt-${tt.id}`}
                        type="datetime-local"
                        defaultValue={toDatetimeLocalInput(tt.early_bird_start_at as string | null)}
                      />
                      <LabeledInput
                        label="Early bird ends"
                        name="early_bird_end_at"
                        idPrefix={`tt-${tt.id}`}
                        type="datetime-local"
                        defaultValue={toDatetimeLocalInput(tt.early_bird_end_at as string | null)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`tt-${tt.id}-status`} className={organizerLabel}>
                        Status
                      </label>
                      <select
                        id={`tt-${tt.id}-status`}
                        name="status"
                        className={organizerField}
                        defaultValue={tt.status as string}
                      >
                        {TICKET_TYPE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {ticketStatusLabels[s] ?? s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className={organizerBtnPrimary + " w-full sm:w-auto"}>
                    Save ticket type
                  </button>
                </form>
              </CollapsibleTicketTypeCard>
            ))}
          </ul>

          {(ticketTypes ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No ticket types yet. Add one above.
            </p>
          ) : null}
        </section>

        <section className="space-y-6 scroll-mt-28" id="check-in-staff">
          <div>
            <h2 className={organizerSectionTitle}>Check-in staff</h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Invite people by email to scan QR tickets at this event. They accept a secure link, use
              the same email to sign in or register, and only get scanner access here—not organizer
              or ticket tools.
            </p>
            <p className="mt-4">
              <Link
                href={`/organizer/events/${eventId}/scan`}
                className={organizerBtnSecondary + " inline-flex"}
              >
                Open check-in scanner
              </Link>
            </p>
          </div>

          <div className={organizerPanel + " p-6 sm:p-8"}>
            <form
              action={inviteEventStaff.bind(null, eventId)}
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="staff-invite-email" className={organizerLabel}>
                  Staff email
                </label>
                <input
                  id="staff-invite-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="staff@venue.com"
                  className={organizerField}
                />
              </div>
              <button type="submit" className={organizerBtnPrimary + " w-full shrink-0 sm:w-auto"}>
                Send invite
              </button>
            </form>
          </div>

          <div className={organizerPanel + " p-6 sm:p-8"}>
            <h3 className="text-sm font-semibold text-foreground">Invitations</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {(staffInvites ?? []).length === 0 ? (
                <li className="text-muted-foreground">No invitations yet.</li>
              ) : (
                invitesPage.slice.map((inv) => {
                  const exp = new Date(inv.expires_at as string);
                  const isPast = exp.getTime() < Date.now();
                  const st = inv.status as string;
                  const label =
                    st === "pending" && isPast ? "expired" : st;
                  const badgeClass =
                    label === "pending"
                      ? "bg-warning/15 text-warning"
                      : label === "accepted"
                        ? "bg-success-muted text-success"
                        : "bg-muted text-muted-foreground";
                  return (
                    <li
                      key={inv.id as string}
                      className="flex flex-col gap-2 border-b border-border/80 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">{inv.email as string}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                          >
                            {label}
                          </span>
                          <span className="mx-2 text-border">·</span>
                          Expires {exp.toLocaleString()}
                        </p>
                      </div>
                      {st === "pending" && !isPast ? (
                        <form action={revokeStaffInvitation}>
                          <input type="hidden" name="event_id" value={eventId} />
                          <input type="hidden" name="invitation_id" value={inv.id as string} />
                          <button
                            type="submit"
                            className={organizerBtnSecondary + " text-xs"}
                          >
                            Revoke invite
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
            {(staffInvites ?? []).length > 0 ? (
              <ListPagination
                pathname={eventSetupPath}
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

          <div className={organizerPanel + " p-6 sm:p-8"}>
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
                  const badge =
                    es.status === "active"
                      ? "bg-success-muted text-success"
                      : "bg-muted text-muted-foreground";
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
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}
                          >
                            {es.status as string}
                          </span>
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
                          <button
                            type="submit"
                            className={organizerBtnSecondary + " text-xs"}
                          >
                            Revoke access
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
            {(eventStaffRows ?? []).length > 0 ? (
              <ListPagination
                pathname={eventSetupPath}
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

function LabeledInput({
  label,
  name,
  idPrefix = "fld",
  type = "text",
  required,
  defaultValue,
  min,
  step,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  idPrefix?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  min?: number;
  step?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `${idPrefix}-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={organizerLabel}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        min={min}
        step={step}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={organizerField}
      />
    </div>
  );
}
