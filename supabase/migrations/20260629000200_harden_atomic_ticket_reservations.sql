-- Harden atomic ticket reservations.
--
-- The first reservation RPC made capacity checks atomic. This replacement keeps
-- that lock behavior, but computes price and hold expiry inside the database so
-- direct RPC callers cannot spoof totals or extend holds.

create or replace function public.reserve_ticket_capacity (
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_quantity int,
  p_unit_price_locked numeric,
  p_total_amount numeric,
  p_pricing_type text,
  p_capacity_hold_expires_at timestamptz,
  p_payment_expires_at timestamptz,
  p_early_bird_price_expires_at timestamptz default null
)
returns table (
  order_id uuid,
  created boolean,
  slots_left int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid ();
  v_profile record;
  v_event record;
  v_ticket_type record;
  v_existing_order record;
  v_existing_order_id uuid;
  v_reserved int := 0;
  v_available int := 0;
  v_order_id uuid;
  v_created boolean := false;
  v_now timestamptz := now ();
  v_pricing_type text := 'regular';
  v_unit_price numeric(12, 2) := 0;
  v_total_amount numeric(12, 2) := 0;
  v_capacity_hold_expires_at timestamptz;
  v_payment_expires_at timestamptz;
  v_early_bird_price_expires_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Choose a whole number of tickets (at least 1).';
  end if;

  perform public.expire_stale_unpaid_orders ();

  select p.role, p.status
    into v_profile
  from public.profiles p
  where p.id = v_user_id;

  if not found or v_profile.role is distinct from 'attendee' then
    raise exception 'Only attendees can reserve tickets.';
  end if;

  if v_profile.status is not distinct from 'disabled' then
    raise exception 'This account has been disabled.';
  end if;

  select
      e.id,
      e.status,
      e.capacity_hold_minutes,
      e.payment_hold_minutes,
      e.early_bird_hold_minutes
    into v_event
  from public.events e
  where e.id = p_event_id;

  if not found or v_event.status is distinct from 'published' then
    raise exception 'This event is not open for registration.';
  end if;

  select tt.*
    into v_ticket_type
  from public.ticket_types tt
  where tt.id = p_ticket_type_id
    and tt.event_id = p_event_id
  for update;

  if not found or v_ticket_type.status is distinct from 'active' then
    raise exception 'This ticket type is not available.';
  end if;

  if v_ticket_type.quantity is null or v_ticket_type.quantity < 1 then
    raise exception 'Invalid ticket capacity.';
  end if;

  if v_ticket_type.early_bird_start_at is not null
    and v_ticket_type.early_bird_end_at is not null
    and v_now >= v_ticket_type.early_bird_start_at
    and v_now <= v_ticket_type.early_bird_end_at then
    v_pricing_type := 'early_bird';
    v_unit_price := v_ticket_type.early_bird_price;
    v_early_bird_price_expires_at := least(
      v_now + (interval '1 minute' * coalesce(v_event.early_bird_hold_minutes, 15)),
      v_ticket_type.early_bird_end_at
    );
  else
    v_pricing_type := 'regular';
    v_unit_price := v_ticket_type.regular_price;
    v_early_bird_price_expires_at := null;
  end if;

  v_total_amount := round((v_unit_price * p_quantity)::numeric, 2);
  v_capacity_hold_expires_at := v_now + (interval '1 minute' * coalesce(v_event.capacity_hold_minutes, 15));
  v_payment_expires_at := v_now + (interval '1 minute' * coalesce(v_event.payment_hold_minutes, 15));

  select o.*
    into v_existing_order
  from public.orders o
  where o.buyer_user_id = v_user_id
    and o.event_id = p_event_id
    and o.status in ('capacity_held', 'payment_pending')
  order by o.created_at desc
  limit 1
  for update;

  if found and v_existing_order.status = 'payment_pending' then
    raise exception 'You have a payment in progress. Open HitPay checkout or release this reservation to change tickets.';
  end if;

  if found then
    v_existing_order_id := v_existing_order.id;
  end if;

  select coalesce(sum(o.quantity), 0)::int
    into v_reserved
  from public.orders o
  where o.ticket_type_id = p_ticket_type_id
    and (
      (o.status = 'capacity_held' and o.capacity_hold_expires_at > now ())
      or (o.status = 'payment_pending' and o.payment_expires_at > now ())
      or o.status in ('paid_unassigned', 'partially_assigned', 'completed')
    )
    and (
      v_existing_order_id is null
      or o.id is distinct from v_existing_order_id
    );

  v_available := greatest(0, v_ticket_type.quantity - v_reserved);

  if p_quantity > v_available then
    if v_available <= 0 then
      raise exception 'This ticket type is sold out for now.';
    end if;

    raise exception 'Only % ticket slot(s) left for this type.', v_available;
  end if;

  if v_existing_order_id is not null then
    update public.orders
    set
      ticket_type_id = p_ticket_type_id,
      quantity = p_quantity,
      unit_price_locked = v_unit_price,
      total_amount = v_total_amount,
      pricing_type = v_pricing_type,
      status = 'capacity_held',
      capacity_hold_expires_at = v_capacity_hold_expires_at,
      payment_expires_at = v_payment_expires_at,
      early_bird_price_expires_at = v_early_bird_price_expires_at
    where id = v_existing_order_id
    returning id into v_order_id;
  else
    insert into public.orders (
      buyer_user_id,
      event_id,
      ticket_type_id,
      quantity,
      unit_price_locked,
      total_amount,
      pricing_type,
      status,
      capacity_hold_expires_at,
      payment_expires_at,
      early_bird_price_expires_at
    )
    values (
      v_user_id,
      p_event_id,
      p_ticket_type_id,
      p_quantity,
      v_unit_price,
      v_total_amount,
      v_pricing_type,
      'capacity_held',
      v_capacity_hold_expires_at,
      v_payment_expires_at,
      v_early_bird_price_expires_at
    )
    returning id into v_order_id;

    v_created := true;
  end if;

  return query
  select v_order_id, v_created, greatest(0, v_available - p_quantity);
end;
$$;

grant execute on function public.reserve_ticket_capacity (
  uuid,
  uuid,
  int,
  numeric,
  numeric,
  text,
  timestamptz,
  timestamptz,
  timestamptz
) to authenticated;
