create table if not exists public.event_recommended_locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category text not null default 'hotel',
  name text not null,
  formatted_address text,
  place_id text,
  lat numeric,
  lng numeric,
  sort_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_recommended_locations_category_check
    check (category in ('hotel', 'transport', 'other'))
);

create index if not exists event_recommended_locations_event_order_idx
  on public.event_recommended_locations (event_id, sort_order, created_at);

drop trigger if exists set_event_recommended_locations_updated_at on public.event_recommended_locations;
create trigger set_event_recommended_locations_updated_at
  before update on public.event_recommended_locations
  for each row execute procedure public.set_updated_at();

alter table public.event_recommended_locations enable row level security;

drop policy if exists "event_recommended_locations_select" on public.event_recommended_locations;
create policy "event_recommended_locations_select"
  on public.event_recommended_locations for select
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_recommended_locations.event_id
        and e.status = 'published'
    )
    or exists (
      select 1
      from public.events e
      where e.id = event_recommended_locations.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "event_recommended_locations_insert_organizer" on public.event_recommended_locations;
create policy "event_recommended_locations_insert_organizer"
  on public.event_recommended_locations for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.events e
      where e.id = event_recommended_locations.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "event_recommended_locations_update_organizer" on public.event_recommended_locations;
create policy "event_recommended_locations_update_organizer"
  on public.event_recommended_locations for update
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_recommended_locations.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  )
  with check (
    exists (
      select 1
      from public.events e
      where e.id = event_recommended_locations.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "event_recommended_locations_delete_organizer" on public.event_recommended_locations;
create policy "event_recommended_locations_delete_organizer"
  on public.event_recommended_locations for delete
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_recommended_locations.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  );
