import { PublicShell } from "@/components/layout/PublicShell";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolvePublishedEventForAttendee } from "@/lib/event/attendeeEvent";

interface EventData {
  id: string;
  name: string;
  description?: string;
  venue?: string;
  event_date?: string;
  formatted_address?: string;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { event: rawEvent, message } = await resolvePublishedEventForAttendee(supabase);
  const event = rawEvent as unknown as EventData | null;

  // If no event is published, show a graceful "Coming Soon" hero
  if (!event) {
    return (
      <PublicShell>
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
          <div className="animate-fade-in-up max-w-3xl">
            <p className="eyebrow mb-6">Weddings &amp; Celebrations</p>
            <h1 className="font-serif text-5xl md:text-7xl font-light mb-8 text-foreground leading-[1.1]">
              A new chapter <br /> 
              <span className="italic font-normal text-accent-gold">is coming</span>
            </h1>
            <p className="max-w-xl mx-auto text-base text-muted-foreground leading-relaxed mb-12 font-light">
              We are currently crafting an extraordinary event experience. 
              Check back soon for tickets and registration details.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login" className="btn-eventuz-secondary min-w-[200px]">
                Organizer Login
              </Link>
            </div>
          </div>
        </div>
      </PublicShell>
    );
  }

  // Fetch ticket types for pricing info
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("regular_price, status")
    .eq("event_id", event.id)
    .eq("status", "active")
    .order("regular_price", { ascending: true });

  const minPrice = ticketTypes?.[0]?.regular_price;
  
  // Format date using native Intl
  const eventDate = event.event_date 
    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(event.event_date))
    : null;

  return (
    <PublicShell>
      <div className="relative flex flex-1 flex-col items-center overflow-hidden px-4 py-12 md:py-24">
        {/* Subtle background ornamentation */}
        <div 
          className="absolute inset-0 -z-10 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--champagne) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />

        <div className="w-full max-w-7xl mx-auto lg:grid lg:grid-cols-12 lg:gap-16 lg:items-start">
          
          {/* LEFT COLUMN: Narrative & Information */}
          <div className="lg:col-span-7 space-y-12 animate-fade-in-up">
            <div className="text-left">
              <p className="eyebrow mb-6">Featured Event</p>
              
              {/* Luxury Divider */}
              <div className="flex items-center gap-4 mb-10">
                <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
                <span className="h-[1px] w-24 bg-gradient-to-r from-accent-gold/40 to-transparent" />
              </div>

              <h1 
                className="font-serif text-5xl md:text-8xl font-light mb-8 text-foreground leading-[1.05]"
                style={{ letterSpacing: "-0.01em" }}
              >
                {event.name}
              </h1>

              <p className="max-w-2xl text-xl md:text-2xl text-muted-foreground leading-relaxed font-light italic border-l-2 border-accent-gold/20 pl-8 py-2">
                &ldquo;{event.description || "A celebration of love, commitment, and new beginnings."}&rdquo;
              </p>
            </div>

            {/* Informational Cards - Grid within Left Column */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pt-8">
              <div className="panel-card p-8 flex flex-col justify-between min-h-[220px]">
                <div>
                  <p className="label-eventuz mb-3">RSVP & Registration</p>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Confirm your attendance and select your preferred seating tier in just a few clicks.
                  </p>
                </div>
                <div className="mt-6 border-t border-border/50 pt-6 flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-warm-gray">Secure & Quick</span>
                  <div className="h-1.5 w-1.5 rotate-45 bg-border" />
                </div>
              </div>

              <div className="panel-card p-8 flex flex-col justify-between min-h-[220px] border-accent-gold/20">
                <div>
                  <p className="label-eventuz mb-3" style={{ color: 'var(--accent-gold)' }}>Venue Details</p>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed text-wrap">
                    {event.formatted_address || event.venue || "Experience elegance at our curated event space."}
                  </p>
                </div>
                <div className="mt-6 border-t border-border/50 pt-6 flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-warm-gray">Directions Provided</span>
                  <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
                </div>
              </div>

              <div className="panel-card p-8 flex flex-col justify-between min-h-[220px] md:col-span-2">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1">
                    <p className="label-eventuz mb-3">Live Experience</p>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed">
                      Real-time check-ins and digital ticket delivery ensure a smooth entry on the day of the event. We've streamlined every step to prioritize your comfort.
                    </p>
                  </div>
                  <div className="shrink-0 pt-1">
                    <div className="h-12 w-12 rounded-full border border-accent-gold/20 flex items-center justify-center">
                      <div className="h-2 w-2 rotate-45 bg-accent-gold" />
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t border-border/50 pt-6 flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-warm-gray">Digital Ticketing</span>
                  <div className="h-1.5 w-1.5 rotate-45 bg-border" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Action Panel */}
          <div className="lg:col-span-5 mt-16 lg:mt-0 lg:sticky lg:top-32 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="panel-card p-8 md:p-12 border-accent-gold/30 bg-accent-gold/[0.02] shadow-xl shadow-accent-gold/[0.03]">
              <h3 className="font-serif text-2xl font-light mb-10 text-foreground border-b border-accent-gold/10 pb-6">Event Details</h3>
              
              <div className="space-y-10 mb-12">
                {eventDate && (
                  <div className="flex items-start gap-6">
                    <div className="h-10 w-10 shrink-0 border border-accent-gold/20 flex items-center justify-center">
                      <span className="text-accent-gold text-xs italic font-serif">Dt.</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold mb-1">Date & Time</span>
                      <span className="text-xl font-light text-foreground">{eventDate}</span>
                    </div>
                  </div>
                )}
                
                {event.venue && (
                  <div className="flex items-start gap-6">
                    <div className="h-10 w-10 shrink-0 border border-accent-gold/20 flex items-center justify-center">
                      <span className="text-accent-gold text-xs italic font-serif">Lc.</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold mb-1">Location</span>
                      <span className="text-xl font-light text-foreground">{event.venue}</span>
                    </div>
                  </div>
                )}

                {minPrice !== undefined && (
                  <div className="flex items-start gap-6">
                    <div className="h-10 w-10 shrink-0 border border-accent-gold/20 flex items-center justify-center">
                      <span className="text-accent-gold text-xs italic font-serif">Pr.</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold mb-1">Pricing</span>
                      <span className="text-xl font-light text-foreground">Starting at ₱{Number(minPrice).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Link 
                  href={`/register?event=${event.id}`} 
                  className="btn-eventuz-gold w-full py-5 shadow-lg shadow-accent-gold/10 text-base"
                >
                  Reserve your seat
                </Link>
                <Link 
                  href="/login" 
                  className="btn-eventuz-secondary w-full py-4 text-sm"
                >
                  Sign in to your account
                </Link>
              </div>

              <div className="mt-10 pt-8 border-t border-border/50 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-warm-gray mb-2">Eventuz Experience</p>
                <div className="flex justify-center gap-1.5">
                  <div className="h-1 w-1 rotate-45 bg-accent-gold/30" />
                  <div className="h-1 w-1 rotate-45 bg-accent-gold" />
                  <div className="h-1 w-1 rotate-45 bg-accent-gold/30" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PublicShell>
  );
}
