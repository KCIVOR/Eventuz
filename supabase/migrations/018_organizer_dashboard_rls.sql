-- Organizer operational dashboard: read-only access to payments and buyer profiles for own events.

drop policy if exists "payments_select_organizer" on public.payments;
create policy "payments_select_organizer"
  on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = payments.order_id
        and e.organizer_id = auth.uid ()
    )
  );

drop policy if exists "profiles_select_buyer_for_organizer_event_orders" on public.profiles;
create policy "profiles_select_buyer_for_organizer_event_orders"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.buyer_user_id = profiles.id
        and e.organizer_id = auth.uid ()
    )
  );
