-- 042_announcement_rls_attendee_fix.sql
-- Fix announcement visibility for attendees who are not the buyer.
-- Also add a helper to get current user's email safely.

create or replace function public.get_current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where id = auth.uid();
$$;

-- UPDATE SELECT policy
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
      left join public.seat_assignments sa on sa.order_id = o.id
      where o.event_id = event_announcements.event_id
        and o.status in ('paid', 'completed')
        and (
          o.buyer_user_id = auth.uid()
          or sa.attendee_email = (select email from public.profiles where id = auth.uid())
        )
    )
  );
