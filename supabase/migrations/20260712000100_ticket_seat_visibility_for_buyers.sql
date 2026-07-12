-- Allow attendees to read the seat and ticket-type metadata attached to their own issued tickets.
-- Without these policies, the tickets row is visible to the buyer, but nested seats/ticket_types
-- can be hidden by RLS after the order is completed, causing ticket UIs/emails to show only "Seat".

drop policy if exists "seats_select_ticket_buyer" on public.seats;
create policy "seats_select_ticket_buyer"
  on public.seats for select to authenticated
  using (
    exists (
      select 1
      from public.tickets tk
      join public.orders o on o.id = tk.order_id
      where tk.seat_id = seats.id
        and tk.status is distinct from 'voided'
        and o.buyer_user_id = auth.uid()
    )
  );

drop policy if exists "ticket_types_select_ticket_buyer" on public.ticket_types;
create policy "ticket_types_select_ticket_buyer"
  on public.ticket_types for select to authenticated
  using (
    exists (
      select 1
      from public.tickets tk
      join public.orders o on o.id = tk.order_id
      where tk.ticket_type_id = ticket_types.id
        and tk.status is distinct from 'voided'
        and o.buyer_user_id = auth.uid()
    )
  );
