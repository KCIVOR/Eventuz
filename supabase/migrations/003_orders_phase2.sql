-- Eventuz Phase 2: orders + capacity holds + attendee read published catalog
-- Run after 001_phase1_schema.sql and 002_profiles_email_status.sql

-- ---------------------------------------------------------------------------
-- Orders (capacity hold before payment — Phase 2)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid (),
  buyer_user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  quantity int not null check (quantity > 0),
  unit_price_locked numeric(12, 2) not null check (unit_price_locked >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  pricing_type text not null
    check (pricing_type in ('regular', 'early_bird')),
  status text not null default 'capacity_held'
    check (status in ('capacity_held', 'payment_pending', 'expired', 'cancelled', 'payment_failed', 'paid')),
  capacity_hold_expires_at timestamptz not null,
  payment_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_idx on public.orders (buyer_user_id);
create index if not exists orders_event_idx on public.orders (event_id);
create index if not exists orders_ticket_type_idx on public.orders (ticket_type_id);
create index if not exists orders_status_hold_idx on public.orders (status)
  where status = 'capacity_held';

-- At most one active capacity hold per buyer per event (Phase 2)
create unique index if not exists orders_one_active_hold_per_buyer_event
  on public.orders (buyer_user_id, event_id)
  where status = 'capacity_held';

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- RLS: orders
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select to authenticated
  using (buyer_user_id = auth.uid());

drop policy if exists "orders_select_organizer" on public.orders;
create policy "orders_select_organizer"
  on public.orders for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = orders.event_id and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "orders_select_super_admin" on public.orders;
create policy "orders_select_super_admin"
  on public.orders for select to authenticated
  using (public.is_super_admin ());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert to authenticated
  with check (
    buyer_user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'attendee'
    )
  );

drop policy if exists "orders_update_own" on public.orders;
create policy "orders_update_own"
  on public.orders for update to authenticated
  using (buyer_user_id = auth.uid())
  with check (buyer_user_id = auth.uid());

drop policy if exists "orders_delete_own_hold" on public.orders;
create policy "orders_delete_own_hold"
  on public.orders for delete to authenticated
  using (buyer_user_id = auth.uid() and status = 'capacity_held');

-- ---------------------------------------------------------------------------
-- Attendees can read published events + ticket types
-- (Additional permissive policies; existing organizer/super_admin policies remain.)
-- ---------------------------------------------------------------------------
drop policy if exists "events_select_published" on public.events;
create policy "events_select_published"
  on public.events for select to authenticated
  using (status = 'published');

drop policy if exists "ticket_types_select_published" on public.ticket_types;
create policy "ticket_types_select_published"
  on public.ticket_types for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.status = 'published'
    )
    and ticket_types.status = 'active'
  );
