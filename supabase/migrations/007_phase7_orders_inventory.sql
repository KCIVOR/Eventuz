-- Phase 7: order model completion + inventory statuses + paid_unassigned

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists early_bird_price_expires_at timestamptz;

-- Payment window required for all orders (used when payment flow starts)
update public.orders
set payment_expires_at = coalesce (
  payment_expires_at,
  capacity_hold_expires_at,
  now() + (interval '1 minute' * coalesce (
    (
      select e.payment_hold_minutes
      from public.events e
      where e.id = orders.event_id
    ),
    15
  ))
)
where payment_expires_at is null;

alter table public.orders alter column payment_expires_at set not null;

-- ---------------------------------------------------------------------------
-- paid → paid_unassigned (Phase 7 vocabulary)
-- ---------------------------------------------------------------------------
update public.orders
set status = 'paid_unassigned'
where status = 'paid';

-- ---------------------------------------------------------------------------
-- Status constraint
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders add constraint orders_status_check check (
  status in (
    'draft',
    'capacity_held',
    'payment_pending',
    'payment_failed',
    'expired',
    'paid_unassigned',
    'partially_assigned',
    'completed',
    'cancelled'
  )
);

-- ---------------------------------------------------------------------------
-- One active pre-payment order per buyer per event
-- ---------------------------------------------------------------------------
drop index if exists public.orders_one_active_hold_per_buyer_event;

create unique index if not exists orders_one_active_checkout_per_buyer_event
  on public.orders (buyer_user_id, event_id)
  where status in ('capacity_held', 'payment_pending');

-- ---------------------------------------------------------------------------
-- Admission issuance: paid orders are expressed as paid_unassigned
-- ---------------------------------------------------------------------------
create or replace function public.issue_admission_tickets_for_order (p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  inserted int;
begin
  select * into strict rec from public.orders where id = p_order_id for update;

  if rec.buyer_user_id is distinct from auth.uid () then
    raise exception 'Not allowed to issue tickets for this order.';
  end if;

  if rec.status is distinct from 'paid_unassigned' then
    raise exception 'Order must be paid before tickets can be issued.';
  end if;

  if exists (
    select 1 from public.admission_tickets t where t.order_id = p_order_id limit 1
  ) then
    return;
  end if;

  with
    picked as (
      select s.id
      from public.seats s
      where s.ticket_type_id = rec.ticket_type_id
        and s.event_id = rec.event_id
        and s.status = 'available'
      order by s.created_at
      limit rec.quantity
      for update
    ),
    assigned as (
      update public.seats s
      set status = 'assigned'
      from picked p
      where s.id = p.id
      returning s.id
    )
  insert into public.admission_tickets (order_id, seat_id)
  select p_order_id, a.id from assigned a;

  get diagnostics inserted = row_count;

  if coalesce (inserted, 0) is distinct from rec.quantity then
    raise exception 'Could not assign seats for this order (inventory may be insufficient).';
  end if;
end;
$$;

grant execute on function public.issue_admission_tickets_for_order (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: allow cancelling active pre-payment orders
-- ---------------------------------------------------------------------------
drop policy if exists "orders_delete_own_hold" on public.orders;

create policy "orders_delete_own_hold"
  on public.orders for delete to authenticated
  using (
    buyer_user_id = auth.uid ()
    and status in ('capacity_held', 'payment_pending')
  );
