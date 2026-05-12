import { createTicketType, updateEvent, updateTicketType } from "@/app/organizer/events/actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";
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
import { Input } from "@/components/ui/Input";

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
      withoutFrame
      title="Event setup"
      description={`Status: ${event.status as string} · Public slug: ${event.public_slug as string}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name as string },
      ]}
      actions={
        <Button variant="secondary" asChild>
          <Link href={`/organizer/events/${eventId}/dashboard`}>
            Operations dashboard
          </Link>
        </Button>
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

        <div className="panel-card p-6 sm:p-8">
          <form action={updateEvent.bind(null, eventId)} className="flex flex-col gap-8">
            <section className="space-y-4">
              <h2 className="section-title">Basics</h2>
              <Input label="Event name" name="name" required defaultValue={event.name as string} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="label-eventuz">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={event.description as string}
                  className="input-eventuz"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="status" className="label-eventuz">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  className="input-eventuz"
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
              <h2 className="section-title">Schedule & location</h2>
              <Input label="Venue" name="venue" defaultValue={event.venue as string} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Event date"
                  name="event_date"
                  type="date"
                  required
                  defaultValue={event.event_date as string}
                />
                <Input
                  label="Event time"
                  name="event_time"
                  type="time"
                  required
                  defaultValue={trimTimeForInput(event.event_time)}
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-8">
              <h2 className="section-title">Public link</h2>
              <p className="text-sm text-muted-foreground">
                Attendees will use this identifier in the event URL. Lowercase letters, numbers, and
                hyphens work best.
              </p>
              <Input
                label="Public slug"
                name="public_slug"
                required
                defaultValue={event.public_slug as string}
                autoComplete="off"
              />
            </section>

            <section className="space-y-4 border-t border-border pt-8">
              <h2 className="section-title">Hold durations (minutes)</h2>
              <p className="text-sm text-muted-foreground">
                Stored on this event. Use whole minutes from 1 to 525600.
              </p>
              <fieldset className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-3">
                <legend className="label-eventuz px-1">Per-event timing</legend>
                <Input
                  label="Capacity hold"
                  name="capacity_hold_minutes"
                  type="number"
                  required
                  min={1}
                  defaultValue={String(event.capacity_hold_minutes)}
                />
                <Input
                  label="Payment hold"
                  name="payment_hold_minutes"
                  type="number"
                  required
                  min={1}
                  defaultValue={String(event.payment_hold_minutes)}
                />
                <Input
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
              <div className="callout-eventuz">
                <strong className="font-semibold text-foreground">Ready to go live?</strong>
                <p className="mt-1 text-muted-foreground">
                  Change <em>status</em> to <strong>published</strong> above, then save. Add ticket
                  types below before opening registration.
                </p>
              </div>
            ) : null}

            <Button type="submit" className="w-full sm:w-auto">
              Save changes
            </Button>
          </form>
        </div>

        <section className="space-y-6">
          <div>
            <h2 className="section-title">Ticket types</h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Define inventory, list prices, and optional early-bird windows. Saving updates linked
              seats (manage labels under <strong className="font-medium text-foreground">Seating</strong>{" "}
              → Seat inventory). Checkout and attendee seat picking come later.
            </p>
          </div>

          <div className="callout-eventuz">
            <strong className="font-semibold text-foreground">Validation</strong>
            <p className="mt-1 text-muted-foreground">
              With an early-bird window set, early-bird price must be <em>lower</em> than regular
              price. End must be after start. Quantity is at least 1.
            </p>
          </div>

          <div className="panel-card p-6 sm:p-8">
            <h3 className="text-sm font-semibold text-foreground">Add ticket type</h3>
            <form action={createTicketType.bind(null, eventId)} className="mt-4 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Name"
                  name="name"
                  id="new-tt-name"
                  required
                  placeholder="e.g. General admission"
                />
                <Input
                  label="Quantity"
                  name="quantity"
                  id="new-tt-quantity"
                  type="number"
                  required
                  min={1}
                  defaultValue="1"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-tt-description" className="label-eventuz">
                  Description
                </label>
                <textarea
                  id="new-tt-description"
                  name="description"
                  rows={2}
                  className="input-eventuz"
                  placeholder="Optional details for your team."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Regular price (PHP)"
                  name="regular_price"
                  id="new-tt-regular_price"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  defaultValue="0"
                />
                <Input
                  label="Early bird price (PHP)"
                  name="early_bird_price"
                  id="new-tt-early_bird_price"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  defaultValue="0"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Early bird starts"
                  name="early_bird_start_at"
                  id="new-tt-early_bird_start_at"
                  type="datetime-local"
                />
                <Input
                  label="Early bird ends"
                  name="early_bird_end_at"
                  id="new-tt-early_bird_end_at"
                  type="datetime-local"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-tt-status" className="label-eventuz">
                  Status
                </label>
                <select id="new-tt-status" name="status" className="input-eventuz" defaultValue="active">
                  {TICKET_TYPE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ticketStatusLabels[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Add ticket type
              </Button>
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
                  <StatusBadge status={tt.status as string} />
                }
              >
                <form action={updateTicketType} className="flex flex-col gap-4">
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="ticket_type_id" value={tt.id as string} />
                  <div className="inset-panel space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Name"
                        name="name"
                        id={`tt-${tt.id}-name`}
                        required
                        defaultValue={tt.name as string}
                      />
                      <Input
                        label="Quantity"
                        name="quantity"
                        id={`tt-${tt.id}-quantity`}
                        type="number"
                        required
                        min={1}
                        defaultValue={String(tt.quantity)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`tt-${tt.id}-description`} className="label-eventuz">
                        Description
                      </label>
                      <textarea
                        id={`tt-${tt.id}-description`}
                        name="description"
                        rows={2}
                        defaultValue={tt.description as string}
                        className="input-eventuz"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Regular price (PHP)"
                        name="regular_price"
                        id={`tt-${tt.id}-regular_price`}
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        defaultValue={String(tt.regular_price)}
                      />
                      <Input
                        label="Early bird price (PHP)"
                        name="early_bird_price"
                        id={`tt-${tt.id}-early_bird_price`}
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        defaultValue={String(tt.early_bird_price)}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Early bird starts"
                        name="early_bird_start_at"
                        id={`tt-${tt.id}-early_bird_start_at`}
                        type="datetime-local"
                        defaultValue={toDatetimeLocalInput(tt.early_bird_start_at as string | null)}
                      />
                      <Input
                        label="Early bird ends"
                        name="early_bird_end_at"
                        id={`tt-${tt.id}-early_bird_end_at`}
                        type="datetime-local"
                        defaultValue={toDatetimeLocalInput(tt.early_bird_end_at as string | null)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`tt-${tt.id}-status`} className="label-eventuz">
                        Status
                      </label>
                      <select
                        id={`tt-${tt.id}-status`}
                        name="status"
                        className="input-eventuz"
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
                  <Button type="submit" className="w-full sm:w-auto">
                    Save ticket type
                  </Button>
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

      </div>
    </RoleAreaShell>
  );
}

