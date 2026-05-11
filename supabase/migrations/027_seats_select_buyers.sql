-- Allow buyers who need to assign seats to SELECT inventory for their order's ticket type.
-- Phase 1 policy "seats_select" only exposed seats to organizer/super_admin, so attendee pages
-- saw zero rows (empty picker + seatInventoryTotal 0 under RLS).

drop policy if exists "seats_select_buyer_assigning" on public.seats;

create policy "seats_select_buyer_assigning"
  on public.seats for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.event_id = seats.event_id
        and o.ticket_type_id = seats.ticket_type_id
        and o.buyer_user_id = auth.uid()
        and o.status in ('paid_unassigned', 'partially_assigned')
    )
  );
