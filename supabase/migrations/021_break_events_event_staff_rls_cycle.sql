-- Break RLS cycle between events and event_staff (42P17 infinite recursion):
-- events_select_staff_assignment queried event_staff; event_staff policies
-- queried events; Postgres re-entered policies indefinitely.
-- Helpers read underlying rows with row_security disabled; they only use auth.uid().

create or replace function public.auth_user_owns_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.organizer_id = auth.uid()
  );
$$;

create or replace function public.auth_user_has_active_staff_assignment(
  p_event_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.event_staff es
    where es.event_id = p_event_id
      and es.user_id = p_user_id
      and es.status = 'active'
  );
$$;

create or replace function public.auth_organizer_manages_staff_user(p_staff_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.event_staff es
    join public.events e on e.id = es.event_id
    where es.user_id = p_staff_user_id
      and e.organizer_id = auth.uid()
  );
$$;

grant execute on function public.auth_user_owns_event(uuid) to authenticated;
grant execute on function public.auth_user_has_active_staff_assignment(uuid, uuid) to authenticated;
grant execute on function public.auth_organizer_manages_staff_user(uuid) to authenticated;

drop policy if exists "event_staff_select_self_or_organizer" on public.event_staff;
create policy "event_staff_select_self_or_organizer"
  on public.event_staff for select to authenticated
  using (
    user_id = auth.uid()
    or public.auth_user_owns_event(event_staff.event_id)
    or public.is_super_admin()
  );

drop policy if exists "event_staff_update_organizer" on public.event_staff;
create policy "event_staff_update_organizer"
  on public.event_staff for update to authenticated
  using (public.auth_user_owns_event(event_staff.event_id))
  with check (public.auth_user_owns_event(event_staff.event_id));

drop policy if exists "events_select_staff_assignment" on public.events;
create policy "events_select_staff_assignment"
  on public.events for select to authenticated
  using (public.auth_user_has_active_staff_assignment(events.id, auth.uid()));

drop policy if exists "profiles_select_event_staff_for_organizer" on public.profiles;
create policy "profiles_select_event_staff_for_organizer"
  on public.profiles for select to authenticated
  using (public.auth_organizer_manages_staff_user(profiles.id));

drop policy if exists "check_ins_select_staff" on public.check_ins;
create policy "check_ins_select_staff"
  on public.check_ins for select to authenticated
  using (
    public.auth_user_has_active_staff_assignment(check_ins.event_id, auth.uid())
  );
