-- 040_event_announcements.sql
-- Event announcements per-event.

create table if not exists public.event_announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_announcements_event_id_idx on public.event_announcements (event_id);

-- Enable RLS
alter table public.event_announcements enable row level security;

-- SELECT: Organizer (owner), Attendee (paid order), or Super Admin
drop policy if exists "announcements_select" on public.event_announcements;
create policy "announcements_select"
  on public.event_announcements for select
  to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_announcements.event_id
        and e.organizer_id = auth.uid()
    )
    or exists (
      select 1 from public.orders o
      where o.event_id = event_announcements.event_id
        and o.buyer_user_id = auth.uid()
        and o.status = 'paid'
    )
  );

-- INSERT: Organizer (owner) or Super Admin
drop policy if exists "announcements_insert" on public.event_announcements;
create policy "announcements_insert"
  on public.event_announcements for insert
  to authenticated
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_announcements.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- UPDATE: Organizer (owner) or Super Admin
drop policy if exists "announcements_update" on public.event_announcements;
create policy "announcements_update"
  on public.event_announcements for update
  to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_announcements.event_id
        and e.organizer_id = auth.uid()
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_announcements.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- DELETE: Organizer (owner) or Super Admin
drop policy if exists "announcements_delete" on public.event_announcements;
create policy "announcements_delete"
  on public.event_announcements for delete
  to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_announcements.event_id
        and e.organizer_id = auth.uid()
    )
  );
