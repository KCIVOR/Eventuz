import { PublicShell } from "@/components/layout/PublicShell";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadAttendeeEventContext } from "@/lib/attendee/eventContext";
import { LandingCountdownBar } from "@/components/ui/LandingCountdownBar";
import { EventMapPreview } from "@/components/ui/EventMapPreview";
import { loadActiveGoogleMapsApiKey } from "@/lib/super-admin/loadGoogleMapsSettings";
import { LandingCheckoutModal } from "@/components/attendee/LandingCheckoutModal";
import { isHitPayDevSimulationAllowed } from "@/lib/payments/hitpayDevSimulation";

interface EventData {
  id: string;
  name: string;
  description?: string;
  venue?: string;
  event_date?: string;
  event_time?: string;
  formatted_address?: string;
  image_url?: string;
  lat?: number;
  lng?: number;
  organizer_id?: string;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { event: rawEvent, ticketTypes, registrationOpen, activeOrder, resumeCheckoutUrl } = await loadAttendeeEventContext();
  const event = rawEvent as unknown as EventData | null;
  const showDevHitPaySimulate = event?.organizer_id ? await isHitPayDevSimulationAllowed(event.organizer_id) : false;
  const googleMapsApiKey = await loadActiveGoogleMapsApiKey();

  // If no event is published
  if (!event || !registrationOpen) {
    // Coming Soon fallback logic...
    const placeholderDate = new Date();
    placeholderDate.setDate(placeholderDate.getDate() + 30);

    const comingSoonContent = (
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
        <div className="animate-fade-in-up max-w-3xl">
          <p className="eyebrow mb-6">Weddings &amp; Celebrations</p>
          <h1 className="font-serif text-5xl md:text-7xl font-light mb-8 text-foreground leading-[1.1]">
            A new chapter <br />
            <span className="italic font-normal text-accent-gold">is coming</span>
          </h1>

          <div className="flex justify-center mb-12">
            <LandingCountdownBar targetDate={placeholderDate} />
          </div>

          <p className="max-w-xl mx-auto text-base text-muted-foreground leading-relaxed mb-12 font-light mt-8">
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
    );

    return (
      <PublicShell layout="flush">
        {comingSoonContent}
      </PublicShell>
    );
  }

  // Calculate min price for the countdown bar
  const minPrice = ticketTypes?.length
    ? Math.min(
        ...ticketTypes.map((t) => {
          const earlyBirdStart = t.early_bird_start_at ? new Date(String(t.early_bird_start_at)) : null;
          const earlyBirdEnd = t.early_bird_end_at ? new Date(String(t.early_bird_end_at)) : null;
          const now = new Date();
          const hasActiveEarlyBird =
            Boolean(t.early_bird_price) &&
            earlyBirdStart !== null &&
            earlyBirdEnd !== null &&
            now >= earlyBirdStart &&
            now <= earlyBirdEnd;

          return hasActiveEarlyBird ? Number(t.early_bird_price) : Number(t.regular_price);
        })
      )
    : undefined;

  // Format dates
  const eventDateStr = event.event_date
    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(event.event_date))
    : null;

  // Time formatting (e.g., "09:00" to "9:00 AM")
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10));
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
  };
  const eventTimeStr = formatTime(event.event_time);

  const heroContent = (
    <div className="w-full">
      {/* ── HERO ── */}
      <section className="hero" aria-label={`${event.name} event details`}>
        {event.image_url ? (
          <div className="hero-img" style={{ backgroundImage: `url(${event.image_url})` }} />
        ) : (
          <div className="hero-img" />
        )}
        <div className="hero-overlay" />
        <div className="hero-content animate-fade-in-up">
          <div className="hero-eyebrow">Eventuz Exclusive</div>
          <h1 className="hero-title">{event.name}</h1>
          <p className="hero-sub">A premium experience curated for you.</p>

          <div className="hero-meta">
            {event.event_date && (
              <div className="hero-meta-item">
                <div className="hero-meta-icon"><span className="text-[10px] text-accent-gold font-serif italic">Dt</span></div>
                <div>
                  <span className="hero-meta-label">Date</span>
                  {eventDateStr} {eventTimeStr ? `— ${eventTimeStr}` : ''}
                </div>
              </div>
            )}
            {event.venue && (
              <div className="hero-meta-item">
                <div className="hero-meta-icon"><span className="text-[10px] text-accent-gold font-serif italic">Lc</span></div>
                <div>
                  <span className="hero-meta-label">Location</span>
                  {event.venue}
                </div>
              </div>
            )}
          </div>

          <div className="hero-actions">
            <Link href={`/register?event=${event.id}`} className="btn-eventuz-gold">
              Reserve Your Seat
            </Link>
            <a href="#about" className="btn-eventuz-secondary" style={{ color: '#fff', borderColor: 'rgba(253,250,244,0.3)' }}>
              Explore Event
            </a>
          </div>
        </div>
      </section>

      {/* ── COUNTDOWN BAR ── */}
      {event.event_date && (
        <LandingCountdownBar targetDate={event.event_date} minPrice={minPrice} />
      )}

      {/* ── ABOUT SECTION ── */}
      <section id="about" className="section section-alt">
        <div className="section-content">
          <div className="sec-eyebrow">Overview</div>
          <h2 className="sec-title">About the Event</h2>
          <div className="flex items-center gap-4 mb-10">
            <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
            <span className="h-[1px] w-12 bg-gradient-to-r from-accent-gold/40 to-transparent" />
          </div>

          <div className="about-grid">
            <div className="about-text">
              {event.description || "Join us for an unforgettable experience."}
            </div>

            <div className="about-stats">
              <div className="astat">
                <div className="astat-val">{ticketTypes?.length || 0}</div>
                <div className="astat-label">Ticket Tiers</div>
              </div>
              <div className="astat">
                <div className="astat-val">
                  {ticketTypes?.reduce((acc, curr) => acc + Number(curr.quantity ?? 0), 0) || 0}
                </div>
                <div className="astat-label">Total Capacity</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAP SECTION ── */}
      {event.venue && (
        <section className="section">
          <div className="section-content">
            <div className="sec-eyebrow">Venue</div>
            <h2 className="sec-title">Location Details</h2>
            <div className="flex items-center gap-4 mb-10">
              <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
              <span className="h-[1px] w-12 bg-gradient-to-r from-accent-gold/40 to-transparent" />
            </div>

            <div className="map-section">
              <div className="map-frame">
                {googleMapsApiKey && event.lat && event.lng ? (
                  <div className="w-full h-[360px] overflow-hidden">
                    <EventMapPreview
                      apiKey={googleMapsApiKey}
                      lat={event.lat}
                      lng={event.lng}
                      title={event.venue}
                      address={event.formatted_address || event.venue}
                    />
                  </div>
                ) : event.lat && event.lng ? (
                  <>
                    <div className="map-placeholder" />
                    <div className="map-pin">
                      <div className="map-pin-dot" />
                      <div className="map-pin-line" />
                    </div>
                    <div className="map-ripple" />
                  </>
                ) : (
                  <div className="map-placeholder flex items-center justify-center">
                    <span className="text-muted-foreground text-sm uppercase tracking-widest font-medium">Map Unavailable</span>
                  </div>
                )}
              </div>
              <div className="map-info">
                <h3 className="map-venue">{event.venue}</h3>
                <p className="map-address">{event.formatted_address || "Address details will be provided to registered attendees."}</p>

                {event.lat && event.lng && (
                  <div className="map-coords">
                    {event.lat.toFixed(4)}° N, {event.lng.toFixed(4)}° E
                  </div>
                )}

                {event.formatted_address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.formatted_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-eventuz-secondary"
                  >
                    Get Directions
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TICKETS SECTION ── */}
      {ticketTypes && ticketTypes.length > 0 && (
        <section className="section">
          <div className="section-content">
            <div className="sec-eyebrow">Registration</div>
            <h2 className="sec-title">Reserve Your Seat</h2>
            <div className="flex items-center gap-4 mb-10">
              <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
              <span className="h-[1px] w-12 bg-gradient-to-r from-accent-gold/40 to-transparent" />
            </div>

            <div className="reserve-panel">
              <div className="reserve-panel-mark" aria-hidden="true">
                <span />
                <div />
                <span />
              </div>
              <div className="reserve-panel-copy">
                <p className="reserve-panel-label">Invitation Access</p>
                <h3 className="reserve-panel-title">Secure your place in one elegant step.</h3>
                <p className="reserve-panel-text">
                  Choose your ticket package, complete checkout, and continue to guest details when payment is confirmed.
                </p>
              </div>
              <div className="reserve-panel-meta" aria-label="Ticket availability summary">
                <div>
                  <strong>{ticketTypes.length}</strong>
                  <span>Ticket tier{ticketTypes.length === 1 ? "" : "s"}</span>
                </div>
                {minPrice !== undefined ? (
                  <div>
                    <strong>₱{Number(minPrice).toLocaleString()}</strong>
                    <span>Starting price</span>
                  </div>
                ) : null}
              </div>
              <Link
                href={user ? `?checkout=1` : `/login?next=/?checkout=1`}
                scroll={false}
                className="btn-eventuz-primary reserve-panel-cta"
              >
                Reserve Tickets
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  return (
    <PublicShell layout="flush">
      {heroContent}
      {user && event && (
        <LandingCheckoutModal
          eventId={event.id}
          ticketTypes={ticketTypes}
          activeHold={activeOrder}
          resumeCheckoutUrl={resumeCheckoutUrl}
          showDevHitPaySimulate={showDevHitPaySimulate}
        />
      )}
    </PublicShell>
  );
}
