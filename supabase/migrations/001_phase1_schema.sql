-- Eventuz Phase 1: profiles, events, ticket_types, seats + RLS
-- Run in Supabase SQL Editor (Dashboard → SQL) if not using CLI.
--
-- After this runs:
-- 1) Authentication → URL configuration: add http://localhost:3000/auth/callback (and production URL later).
-- 2) New signups default to role `attendee`. Promote users in SQL, e.g.:
--    update public.profiles set role = 'organizer' where id = '<auth.users.id>';
--    update public.profiles set role = 'super_admin' where id = '<auth.users.id>';
-- 3) Optional: disable "Confirm email" for local dev (Authentication → Providers → Email).
-- 4) Run `002_profiles_email_status.sql` for profile email + active/disabled status (auth/RBAC).

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'attendee'
    check (role in ('attendee', 'organizer', 'staff', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid (),
  organizer_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  description text not null default '',
  venue text not null default '',
  event_date date not null,
  event_time time not null,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'disabled')),
  public_slug text not null unique,
  capacity_hold_minutes int not null default 15,
  payment_hold_minutes int not null default 15,
  early_bird_hold_minutes int not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_organizer_id_idx on public.events (organizer_id);
create index if not exists events_status_idx on public.events (status);

-- ---------------------------------------------------------------------------
-- Ticket types
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid (),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  description text not null default '',
  regular_price numeric(12, 2) not null check (regular_price >= 0),
  early_bird_price numeric(12, 2) not null check (early_bird_price >= 0),
  early_bird_start_at timestamptz,
  early_bird_end_at timestamptz,
  quantity int not null check (quantity >= 1),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'sold_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_types_event_id_idx on public.ticket_types (event_id);

-- ---------------------------------------------------------------------------
-- Seats (quantity must match application-enforced sync with ticket_types)
-- ---------------------------------------------------------------------------
create table if not exists public.seats (
  id uuid primary key default gen_random_uuid (),
  event_id uuid not null references public.events (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete cascade,
  table_label text,
  seat_label text not null default '',
  display_label text not null,
  status text not null default 'available'
    check (status in ('available', 'assigned', 'checked_in', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seats_event_id_idx on public.seats (event_id);
create index if not exists seats_ticket_type_id_idx on public.seats (ticket_type_id);
create unique index if not exists seats_ticket_display_unique
  on public.seats (ticket_type_id, display_label);

-- ---------------------------------------------------------------------------
-- Timestamps
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at ();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at ();

drop trigger if exists set_ticket_types_updated_at on public.ticket_types;
create trigger set_ticket_types_updated_at
  before update on public.ticket_types
  for each row execute procedure public.set_updated_at ();

drop trigger if exists set_seats_updated_at on public.seats;
create trigger set_seats_updated_at
  before update on public.seats
  for each row execute procedure public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- Auth: create profile row on signup (role defaults to attendee; promote in SQL)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'attendee'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- Helpers for RLS (bypasses RLS when SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;

create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'organizer'
  );
$$;

-- ---------------------------------------------------------------------------
-- Role escalation guard on profiles
-- ---------------------------------------------------------------------------
create or replace function public.profiles_prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super admin can change role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute procedure public.profiles_prevent_role_escalation ();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.seats enable row level security;

-- Profiles
drop policy if exists "profiles_select_own_or_super" on public.profiles;
create policy "profiles_select_own_or_super"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin ());

drop policy if exists "profiles_update_own_or_super" on public.profiles;
create policy "profiles_update_own_or_super"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_super_admin ())
  with check (id = auth.uid() or public.is_super_admin ());

-- Events
drop policy if exists "events_select_own_or_super" on public.events;
create policy "events_select_own_or_super"
  on public.events for select to authenticated
  using (organizer_id = auth.uid() or public.is_super_admin ());

drop policy if exists "events_insert_organizer" on public.events;
create policy "events_insert_organizer"
  on public.events for insert to authenticated
  with check (
    organizer_id = auth.uid()
    and public.is_organizer ()
  );

drop policy if exists "events_update_own_organizer" on public.events;
create policy "events_update_own_organizer"
  on public.events for update to authenticated
  using (organizer_id = auth.uid() and public.is_organizer ())
  with check (organizer_id = auth.uid() and public.is_organizer ());

drop policy if exists "events_delete_own_organizer" on public.events;
create policy "events_delete_own_organizer"
  on public.events for delete to authenticated
  using (organizer_id = auth.uid() and public.is_organizer ());

-- Ticket types
drop policy if exists "ticket_types_select" on public.ticket_types;
create policy "ticket_types_select"
  on public.ticket_types for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and (e.organizer_id = auth.uid() or public.is_super_admin())
    )
  );

drop policy if exists "ticket_types_mutate_organizer" on public.ticket_types;
create policy "ticket_types_mutate_organizer"
  on public.ticket_types for insert to authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and e.organizer_id = auth.uid()
        and public.is_organizer()
    )
  );

drop policy if exists "ticket_types_update_organizer" on public.ticket_types;
create policy "ticket_types_update_organizer"
  on public.ticket_types for update to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and e.organizer_id = auth.uid()
        and public.is_organizer()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and e.organizer_id = auth.uid()
        and public.is_organizer()
    )
  );

drop policy if exists "ticket_types_delete_organizer" on public.ticket_types;
create policy "ticket_types_delete_organizer"
  on public.ticket_types for delete to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and e.organizer_id = auth.uid()
        and public.is_organizer()
    )
  );

-- Seats
drop policy if exists "seats_select" on public.seats;
create policy "seats_select"
  on public.seats for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = seats.event_id
        and (e.organizer_id = auth.uid() or public.is_super_admin())
    )
  );

drop policy if exists "seats_insert_organizer" on public.seats;
create policy "seats_insert_organizer"
  on public.seats for insert to authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = seats.event_id
        and e.organizer_id = auth.uid()
        and public.is_organizer()
    )
  );

drop policy if exists "seats_update_organizer" on public.seats;
create policy "seats_update_organizer"
  on public.seats for update to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = seats.event_id
        and e.organizer_id = auth.uid()
        and public.is_organizer()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = seats.event_id
        and e.organizer_id = auth.uid()
        and public.is_organizer()
    )
  );

drop policy if exists "seats_delete_organizer" on public.seats;
create policy "seats_delete_organizer"
  on public.seats for delete to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = seats.event_id
        and e.organizer_id = auth.uid()
        and public.is_organizer()
    )
  );
