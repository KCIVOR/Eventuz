import { createTicketType, updateTicketType } from "@/app/organizer/events/actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { CollapsibleTicketTypeCard } from "@/components/organizer/CollapsibleTicketTypeCard";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { TICKET_TYPE_STATUSES } from "@/lib/organizer/ticketTypeForm";
import { formatPhp } from "@/lib/utils/money";
import { toDatetimeLocalInput } from "@/lib/utils/date";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/Input";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function OrganizerTicketManagementPage({ params, searchParams }: Props) {
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
      title="Ticket Management"
      description={`Configure ticket categories, pricing, and availability for ${event.name}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name as string, href: `/organizer/events/${eventId}` },
        { label: "Tickets" },
      ]}
      actions={
        <Button variant="outline" className="btn-eventuz-secondary py-2" asChild>
          <Link href={`/organizer/events/${eventId}`}>
            Back to Setup
          </Link>
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 pb-20">
        <div className="space-y-10">
          
          {/* Error/Success Alerts — Constrained to same width as content for better alignment */}
          {(q.error || q.ok) && (
            <div className="animate-drop-in">
              {q.error && (
                <div className="alert a-error">
                   <span className="alert-icon">✕</span>
                   <div>
                     <p className="alert-title">Configuration Issue</p>
                     <p>{q.error}</p>
                   </div>
                </div>
              )}
              {q.ok && (
                <div className="alert a-success">
                   <span className="alert-icon">✓</span>
                   <div>
                     <p className="alert-title">Changes Saved</p>
                     <p>Your ticket categories and inventory have been updated successfully.</p>
                   </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* MAIN COLUMN: Existing Tickets */}
            <div className="lg:col-span-7 space-y-8 animate-fade-in-up">
              <div className="flex items-center gap-4">
                <h2 className="font-serif text-2xl font-light text-foreground">Active Categories</h2>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
            
            {(ticketTypes ?? []).length === 0 ? (
              <div className="panel-card py-24 text-center border-dashed border-border/60 bg-muted/5">
                <div className="h-1 w-1 bg-accent-gold rotate-45 mx-auto mb-4 opacity-40" />
                <p className="text-sm font-light text-muted-foreground italic">No ticket categories defined yet.</p>
                <p className="text-xs text-muted-foreground mt-2">Use the form on the right to create your first ticket type.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(ticketTypes ?? []).map((tt) => (
                  <CollapsibleTicketTypeCard
                    key={tt.id as string}
                    ticketTypeId={tt.id as string}
                    title={tt.name as string}
                    summary={`${formatPhp(Number(tt.regular_price))} Regular · ${formatPhp(Number(tt.early_bird_price))} Early Bird · Qty ${tt.quantity}`}
                    defaultExpanded={(ticketTypes ?? []).length === 1}
                    statusBadge={
                      <StatusBadge status={tt.status as string} />
                    }
                  >
                    <form action={updateTicketType} className="space-y-8 p-2">
                      <input type="hidden" name="event_id" value={eventId} />
                      <input type="hidden" name="ticket_type_id" value={tt.id as string} />
                      <input type="hidden" name="redirect_path" value={`/organizer/events/${eventId}/tickets`} />
                      
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
                        <button type="submit" className="btn-eventuz-gold px-8 py-3 text-xs shadow-lg shadow-accent-gold/10">
                          Update Category
                        </button>
                      </div>
                    </form>
                  </CollapsibleTicketTypeCard>
                ))}
              </div>
            )}
          </div>

          {/* SIDEBAR: Creation Form */}
          <aside className="lg:col-span-5 space-y-8 lg:sticky lg:top-32">
            <div className="panel-card p-8 border-accent-gold/20 bg-accent-gold/[0.02] shadow-xl shadow-accent-gold/[0.02] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="space-y-2 mb-8">
                <p className="text-[10px] uppercase tracking-widest text-accent-gold font-bold">New Category</p>
                <h3 className="font-serif text-2xl font-light text-foreground">Create Ticket Type</h3>
              </div>
              
              <form action={createTicketType.bind(null, eventId)} className="space-y-6">
                <input type="hidden" name="redirect_path" value={`/organizer/events/${eventId}/tickets`} />
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

                <div className="pt-4">
                  <Button type="submit" className="w-full btn-eventuz-gold py-5 text-sm shadow-lg shadow-accent-gold/20">
                    Create Ticket Category
                  </Button>
                </div>
              </form>
            </div>

            <div className="panel-card p-8 border-border/40 bg-muted/5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-4">Inventory Rules</h4>
              <ul className="space-y-3">
                <li className="flex gap-3 text-xs text-muted-foreground font-light">
                  <span className="text-accent-gold">✦</span>
                  Each category defines a separate inventory pool.
                </li>
                <li className="flex gap-3 text-xs text-muted-foreground font-light">
                  <span className="text-accent-gold">✦</span>
                  Early Bird pricing is applied automatically based on dates.
                </li>
                <li className="flex gap-3 text-xs text-muted-foreground font-light">
                  <span className="text-accent-gold">✦</span>
                  Inactivating a category hides it from the public landing page.
                </li>
              </ul>
            </div>
          </aside>

          </div>
        </div>
      </div>
    </RoleAreaShell>
  );
}
