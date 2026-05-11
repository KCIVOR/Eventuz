-- Staff can read events they are actively assigned to (incl. draft), for check-in context.
-- Organizers can read profiles of users linked as event staff for their events.

drop policy if exists "events_select_staff_assignment" on public.events;
create policy "events_select_staff_assignment"
  on public.events for select to authenticated
  using (
    exists (
      select 1 from public.event_staff es
      where es.event_id = events.id
        and es.user_id = auth.uid ()
        and es.status = 'active'
    )
  );

drop policy if exists "profiles_select_event_staff_for_organizer" on public.profiles;
create policy "profiles_select_event_staff_for_organizer"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.event_staff es
      join public.events e on e.id = es.event_id
      where es.user_id = profiles.id
        and e.organizer_id = auth.uid ()
    )
  );
