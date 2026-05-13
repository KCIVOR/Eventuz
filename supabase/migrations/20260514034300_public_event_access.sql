-- Allow anyone (anonymous or authenticated) to view published events
drop policy if exists "events_select_public" on public.events;
create policy "events_select_public"
  on public.events for select
  using (status = 'published');

-- Allow anyone to view active ticket types for published events
drop policy if exists "ticket_types_select_public" on public.ticket_types;
create policy "ticket_types_select_public"
  on public.ticket_types for select
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and e.status = 'published'
    )
    and status = 'active'
  );
