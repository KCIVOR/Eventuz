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
import { GooglePlaceAutocomplete } from "@/components/ui/GooglePlaceAutocomplete";
import { loadActiveGoogleMapsApiKey } from "@/lib/super-admin/loadGoogleMapsSettings";
import { EventCoverImageField } from "@/components/organizer/EventCoverImageField";

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

  const googleMapsApiKey = await loadActiveGoogleMapsApiKey();

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
      title="Event Configuration"
      description={`Manage the core details, schedule, and ticketing for ${event.name}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name as string },
      ]}
      actions={
        <Button variant="outline" className="btn-eventuz-secondary py-2" asChild>
          <Link href={`/organizer/events/${eventId}/dashboard`}>
            Operations Dashboard
          </Link>
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 sm:px-8">
        
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
                Event configuration successfully updated.
              </p>
            )}
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
          
          {/* MAIN COLUMN: Core Configuration & Tickets */}
          <div className="lg:col-span-7 space-y-12">
            
            <section className="panel-card p-8 sm:p-10 animate-fade-in-up">
              <form action={updateEvent.bind(null, eventId)} className="space-y-12">
                
                {/* Basics Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h2 className="font-serif text-2xl font-light text-foreground">Basics</h2>
                    <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
                  </div>
                  
                  <Input label="Event Name" name="name" required defaultValue={event.name as string} />
                  
                  <div className="space-y-1.5">
                    <label htmlFor="description" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Narrative / Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={5}
                      defaultValue={event.description as string}
                      className="input-eventuz"
                      placeholder="Describe the affair..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="status" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Visibility Status
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
                            ? "Draft — Private / Under Construction"
                            : s === "published"
                              ? "Published — Visible to Invitees"
                              : "Disabled — Hidden from All"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cover Image */}
                <div className="space-y-6 pt-12 border-t border-border/60">
                  <div className="flex items-center gap-4">
                    <h2 className="font-serif text-2xl font-light text-foreground">Cover Image</h2>
                    <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
                  </div>

                  <EventCoverImageField
                    currentImageUrl={(event.cover_url as string | null) ?? null}
                    eventName={event.name as string}
                    label="Replace cover image"
                  />

                  {event.cover_url ? (
                    <label className="flex items-start gap-3 rounded-sm border border-destructive/20 bg-destructive-muted/40 p-4 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        name="remove_cover_image"
                        value="1"
                        className="mt-1"
                      />
                      <span>
                        Remove the current cover image and return the public landing page to the
                        default hero background.
                      </span>
                    </label>
                  ) : null}
                </div>

                {/* Schedule & Location */}
                <div className="space-y-6 pt-12 border-t border-border/60">
                  <div className="flex items-center gap-4">
                    <h2 className="font-serif text-2xl font-light text-foreground">Venue & Timing</h2>
                    <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Location</label>
                    <GooglePlaceAutocomplete
                      apiKey={googleMapsApiKey}
                      defaultValue={event.venue as string}
                      defaultFormattedAddress={event.formatted_address as string}
                      defaultLat={event.lat ? Number(event.lat) : undefined}
                      defaultLng={event.lng ? Number(event.lng) : undefined}
                      placeholder="Search venue or address..."
                    />
                  </div>
                  
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Input
                      label="Event Date"
                      name="event_date"
                      type="date"
                      required
                      defaultValue={event.event_date as string}
                    />
                    <Input
                      label="Event Time"
                      name="event_time"
                      type="time"
                      required
                      defaultValue={trimTimeForInput(event.event_time)}
                    />
                  </div>
                </div>

                {/* Public Link */}
                <div className="space-y-6 pt-12 border-t border-border/60">
                  <div className="flex items-center gap-4">
                    <h2 className="font-serif text-2xl font-light text-foreground">Access</h2>
                    <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
                  </div>
                  <p className="text-sm font-light text-muted-foreground leading-relaxed">
                    Personalize your event URL. Use lowercase letters, numbers, and hyphens.
                  </p>
                  <Input
                    label="URL Identifier (Slug)"
                    name="public_slug"
                    required
                    defaultValue={event.public_slug as string}
                    autoComplete="off"
                  />
                </div>

                <div className="pt-8 flex justify-end">
                  <Button type="submit" className="btn-eventuz-gold px-10 py-4 shadow-lg shadow-accent-gold/10">
                    Save Event Configuration
                  </Button>
                </div>
              </form>
            </section>

            {/* Existing Ticket Types Section */}
            <section className="space-y-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-4">
                <h2 className="font-serif text-2xl font-light text-foreground">Ticket Inventory</h2>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              
              {(ticketTypes ?? []).length === 0 ? (
                <div className="panel-card py-16 text-center border-dashed border-border/60 bg-muted/5">
                   <p className="text-sm font-light text-muted-foreground">No ticket types defined yet. Use the sidebar to create your first ticket type.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(ticketTypes ?? []).map((tt) => (
                    <CollapsibleTicketTypeCard
                      key={tt.id as string}
                      ticketTypeId={tt.id as string}
                      title={tt.name as string}
                      summary={`${formatPhp(Number(tt.regular_price))} Regular · ${formatPhp(Number(tt.early_bird_price))} Early Bird · Qty ${tt.quantity}`}
                      defaultExpanded={(ticketTypes ?? []).length <= 1}
                      statusBadge={
                        <StatusBadge status={tt.status as string} />
                      }
                    >
                      <form action={updateTicketType} className="space-y-8 p-2">
                        <input type="hidden" name="event_id" value={eventId} />
                        <input type="hidden" name="ticket_type_id" value={tt.id as string} />
                        
                        <div className="grid gap-6 sm:grid-cols-2">
                          <Input label="Name" name="name" required defaultValue={tt.name as string} />
                          <Input label="Quantity" name="quantity" type="number" required min={1} defaultValue={String(tt.quantity)} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Ticket Description</label>
                          <textarea
                            name="description"
                            rows={3}
                            defaultValue={tt.description as string}
                            className="input-eventuz"
                          />
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                          <Input label="Regular Price (PHP)" name="regular_price" type="number" required min={0} step="0.01" defaultValue={String(tt.regular_price)} />
                          <Input label="Early Bird Price (PHP)" name="early_bird_price" type="number" required min={0} step="0.01" defaultValue={String(tt.early_bird_price)} />
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                          <Input
                            label="Early Bird Begins"
                            name="early_bird_start_at"
                            type="datetime-local"
                            defaultValue={toDatetimeLocalInput(tt.early_bird_start_at as string | null)}
                          />
                          <Input
                            label="Early Bird Ends"
                            name="early_bird_end_at"
                            type="datetime-local"
                            defaultValue={toDatetimeLocalInput(tt.early_bird_end_at as string | null)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Ticket Status</label>
                          <select name="status" className="input-eventuz" defaultValue={tt.status as string}>
                            {TICKET_TYPE_STATUSES.map((s) => (
                              <option key={s} value={s}>{ticketStatusLabels[s] ?? s}</option>
                            ))}
                          </select>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button type="submit" className="btn-eventuz-gold px-8 py-3 text-xs">
                            Update Ticket Type
                          </button>
                        </div>
                      </form>
                    </CollapsibleTicketTypeCard>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR: Status, Rules & Creation */}
          <aside className="lg:col-span-5 space-y-8 lg:sticky lg:top-32">
            
            {/* Publication Status Card */}
            <div className={`panel-card p-8 border-l-4 ${event.status === 'published' ? 'border-l-success' : 'border-l-accent-gold'} shadow-lg shadow-accent-gold/[0.03]`}>
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-[10px] uppercase tracking-widest text-accent-gold font-bold">Lifecycle Status</h3>
                 <StatusBadge status={event.status as string} />
              </div>
              
              {event.status === 'draft' ? (
                <div className="space-y-4">
                  <p className="text-sm font-light leading-relaxed text-muted-foreground">
                    Your event is currently a <span className="font-semibold text-foreground">Draft</span>. It is hidden from all public lists and attendee registration.
                  </p>
                  <div className="p-4 rounded-xl bg-accent-gold/5 border border-accent-gold/10">
                     <p className="text-[10px] font-bold text-accent-gold uppercase tracking-wider mb-1">Ready to go live?</p>
                     <p className="text-xs text-muted-foreground font-light">Set status to &apos;Published&apos; in the Basics section and save to begin accepting guests.</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-light leading-relaxed text-muted-foreground">
                   Event is <span className="font-semibold text-foreground">Published</span> and visible to anyone with the public link.
                </p>
              )}
            </div>

            {/* Timing Rules Card */}
            <div className="panel-card p-8 space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-accent-gold font-bold">Reservation Rules</p>
                <h3 className="font-serif text-2xl font-light text-foreground">Hold Durations</h3>
              </div>
              
              <form action={updateEvent.bind(null, eventId)} className="space-y-6">
                 {/* Re-including hidden basic fields to satisfy required form inputs if necessary, 
                     but since we have separate save buttons, we keep them isolated if the action handles partials. 
                     Assuming action needs all fields or we just move the inputs here for specific control. */}
                 <input type="hidden" name="name" defaultValue={event.name as string} />
                 <input type="hidden" name="description" defaultValue={event.description as string} />
                 <input type="hidden" name="status" defaultValue={event.status as string} />
                 <input type="hidden" name="public_slug" defaultValue={event.public_slug as string} />
                 <input type="hidden" name="event_date" defaultValue={event.event_date as string} />
                 <input type="hidden" name="event_time" defaultValue={trimTimeForInput(event.event_time)} />

                 <div className="grid gap-4">
                    <Input label="Capacity Hold (Mins)" name="capacity_hold_minutes" type="number" required min={1} defaultValue={String(event.capacity_hold_minutes)} />
                    <Input label="Payment Hold (Mins)" name="payment_hold_minutes" type="number" required min={1} defaultValue={String(event.payment_hold_minutes)} />
                    <Input label="Early Bird Price Hold (Mins)" name="early_bird_hold_minutes" type="number" required min={1} defaultValue={String(event.early_bird_hold_minutes)} />
                 </div>
                 
                 <Button type="submit" variant="outline" className="w-full btn-eventuz-secondary py-3 text-xs">
                    Update Hold Timing
                 </Button>
              </form>
            </div>

            {/* Add New Ticket Type Portal */}
            <div className="panel-card p-8 border-accent-gold/20 bg-accent-gold/[0.02]">
              <div className="space-y-2 mb-8">
                <p className="text-[10px] uppercase tracking-widest text-accent-gold font-bold">Inventory Management</p>
                <h3 className="font-serif text-2xl font-light text-foreground">Ticket Management</h3>
              </div>
              
              <form action={createTicketType.bind(null, eventId)} className="space-y-6">
                <Input label="Ticket Name" name="name" required placeholder="e.g. VIP Gala" />
                <Input label="Initial Quantity" name="quantity" type="number" required min={1} defaultValue="10" />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Regular Price" name="regular_price" type="number" required min={0} step="0.01" defaultValue="1500" />
                  <Input label="Early Bird Price" name="early_bird_price" type="number" required min={0} step="0.01" defaultValue="1200" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Visibility</label>
                  <select name="status" className="input-eventuz" defaultValue="active">
                    {TICKET_TYPE_STATUSES.map((s) => (
                      <option key={s} value={s}>{ticketStatusLabels[s] ?? s}</option>
                    ))}
                  </select>
                </div>

                <Button type="submit" className="w-full btn-eventuz-gold py-4 shadow-lg shadow-accent-gold/10">
                  Create Ticket Type
                </Button>
              </form>
            </div>

          </aside>
        </div>
      </div>
    </RoleAreaShell>
  );
}

