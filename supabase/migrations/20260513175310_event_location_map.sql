-- Add location-specific fields to events table for Google Maps integration
alter table public.events
  add column if not exists formatted_address text,
  add column if not exists lat numeric,
  add column if not exists lng numeric;

-- Comment for clarity
comment on column public.events.formatted_address is 'Human-readable address from Google Places';
comment on column public.events.lat is 'Latitude coordinate for map placement';
comment on column public.events.lng is 'Longitude coordinate for map placement';
