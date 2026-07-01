-- Event ticket coupons: one free coupon equals one reserved ticket.

create table if not exists public.ticket_coupons (
  id uuid primary key default gen_random_uuid (),
  event_id uuid not null references public.events (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  code_hash text not null unique,
  encrypted_code text not null,
  status text not null default 'active'
    check (status in ('active', 'claimed', 'voided')),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_email text,
  claimed_at timestamptz,
  claimed_order_id uuid unique references public.orders (id) on delete set null,
  voided_by uuid references auth.users (id) on delete set null,
  voided_at timestamptz
);

create index if not exists ticket_coupons_event_idx
  on public.ticket_coupons (event_id, created_at desc);

create index if not exists ticket_coupons_ticket_type_status_idx
  on public.ticket_coupons (ticket_type_id, status);

create index if not exists ticket_coupons_claimed_by_idx
  on public.ticket_coupons (claimed_by);

alter table public.ticket_coupons enable row level security;

drop policy if exists "ticket_coupons_select_organizer_or_claimant" on public.ticket_coupons;
create policy "ticket_coupons_select_organizer_or_claimant"
  on public.ticket_coupons for select to authenticated
  using (
    claimed_by = auth.uid ()
    or public.is_super_admin ()
    or exists (
      select 1 from public.events e
      where e.id = ticket_coupons.event_id
        and e.organizer_id = auth.uid ()
    )
  );

create or replace function public.create_ticket_coupons (
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_code_hashes text[],
  p_encrypted_codes text[]
)
returns table (
  id uuid,
  code_hash text,
  encrypted_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid ();
  v_event record;
  v_ticket_type record;
  v_count int := coalesce(array_length(p_code_hashes, 1), 0);
  v_distinct_count int := 0;
  v_reserved_orders int := 0;
  v_reserved_coupons int := 0;
  v_available int := 0;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  if v_count < 1 or v_count > 200 then
    raise exception 'Create between 1 and 200 coupons at a time.';
  end if;

  if coalesce(array_length(p_encrypted_codes, 1), 0) is distinct from v_count then
    raise exception 'Coupon payload is incomplete.';
  end if;

  select e.id, e.organizer_id
    into v_event
  from public.events e
  where e.id = p_event_id;

  if not found or v_event.organizer_id is distinct from v_user_id then
    raise exception 'Only the event organizer can manage coupons.';
  end if;

  select tt.*
    into v_ticket_type
  from public.ticket_types tt
  where tt.id = p_ticket_type_id
    and tt.event_id = p_event_id
  for update;

  if not found then
    raise exception 'Ticket type not found for this event.';
  end if;

  if v_ticket_type.status is distinct from 'active' then
    raise exception 'Coupons can only be created for active ticket types.';
  end if;

  select count(distinct h)::int
    into v_distinct_count
  from unnest(p_code_hashes) h
  where h is not null and length(trim(h)) = 64;

  if v_distinct_count is distinct from v_count then
    raise exception 'Coupon codes must be unique and valid.';
  end if;

  if exists (
    select 1
    from public.ticket_coupons c
    where c.code_hash = any(p_code_hashes)
  ) then
    raise exception 'One or more coupon codes already exist.';
  end if;

  perform public.expire_stale_unpaid_orders ();

  select coalesce(sum(o.quantity), 0)::int
    into v_reserved_orders
  from public.orders o
  where o.ticket_type_id = p_ticket_type_id
    and (
      (o.status = 'capacity_held' and o.capacity_hold_expires_at > now ())
      or (o.status = 'payment_pending' and o.payment_expires_at > now ())
      or o.status in ('paid_unassigned', 'partially_assigned', 'completed')
    );

  select count(*)::int
    into v_reserved_coupons
  from public.ticket_coupons c
  where c.ticket_type_id = p_ticket_type_id
    and c.status = 'active';

  v_available := greatest(0, v_ticket_type.quantity - v_reserved_orders - v_reserved_coupons);

  if v_count > v_available then
    if v_available <= 0 then
      raise exception 'This ticket type has no remaining inventory for coupons.';
    end if;

    raise exception 'Only % ticket slot(s) left for coupon creation.', v_available;
  end if;

  return query
  insert into public.ticket_coupons (
    event_id,
    ticket_type_id,
    code_hash,
    encrypted_code,
    created_by
  )
  select
    p_event_id,
    p_ticket_type_id,
    row_data.code_hash,
    row_data.encrypted_code,
    v_user_id
  from unnest(p_code_hashes, p_encrypted_codes) as row_data(code_hash, encrypted_code)
  returning ticket_coupons.id, ticket_coupons.code_hash, ticket_coupons.encrypted_code;
end;
$$;

grant execute on function public.create_ticket_coupons (uuid, uuid, text[], text[]) to authenticated;

create or replace function public.void_ticket_coupon (p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid ();
  v_coupon record;
begin
  if v_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select c.*
    into v_coupon
  from public.ticket_coupons c
  where c.id = p_coupon_id
  for update;

  if not found then
    raise exception 'Coupon not found.';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = v_coupon.event_id
      and e.organizer_id = v_user_id
  ) then
    raise exception 'Only the event organizer can void this coupon.';
  end if;

  if v_coupon.status is distinct from 'active' then
    raise exception 'Only unclaimed active coupons can be voided.';
  end if;

  update public.ticket_coupons
  set
    status = 'voided',
    voided_by = v_user_id,
    voided_at = now()
  where id = p_coupon_id;
end;
$$;

grant execute on function public.void_ticket_coupon (uuid) to authenticated;

create or replace function public.claim_ticket_coupon (
  p_event_id uuid,
  p_code_hash text
)
returns table (
  order_id uuid,
  event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid ();
  v_profile record;
  v_event record;
  v_coupon record;
  v_order_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to claim a coupon.';
  end if;

  select p.role, p.status, p.email
    into v_profile
  from public.profiles p
  where p.id = v_user_id;

  if not found or v_profile.role is distinct from 'attendee' then
    raise exception 'Only attendee accounts can claim coupons.';
  end if;

  if v_profile.status is not distinct from 'disabled' then
    raise exception 'This account has been disabled.';
  end if;

  select e.id, e.status
    into v_event
  from public.events e
  where e.id = p_event_id;

  if not found or v_event.status is distinct from 'published' then
    raise exception 'This event is not open for coupon claims.';
  end if;

  perform public.expire_stale_unpaid_orders ();

  select c.*
    into v_coupon
  from public.ticket_coupons c
  where c.event_id = p_event_id
    and c.code_hash = trim(p_code_hash)
  for update;

  if not found then
    raise exception 'Coupon code is invalid.';
  end if;

  if v_coupon.status is distinct from 'active' then
    raise exception 'This coupon has already been used or is no longer active.';
  end if;

  if exists (
    select 1
    from public.orders o
    where o.buyer_user_id = v_user_id
      and o.event_id = p_event_id
      and o.status in ('capacity_held', 'payment_pending')
  ) then
    raise exception 'Finish or cancel your current reservation before claiming a coupon.';
  end if;

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
    v_coupon.ticket_type_id,
    1,
    0,
    0,
    'regular',
    'paid_unassigned',
    now(),
    now(),
    null
  )
  returning id into v_order_id;

  update public.ticket_coupons
  set
    status = 'claimed',
    claimed_by = v_user_id,
    claimed_email = v_profile.email,
    claimed_at = now(),
    claimed_order_id = v_order_id
  where id = v_coupon.id;

  return query select v_order_id, p_event_id;
end;
$$;

grant execute on function public.claim_ticket_coupon (uuid, text) to authenticated;

-- Make normal paid reservations aware of active unclaimed coupon reservations.
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
  v_coupon_reserved int := 0;
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

  select count(*)::int
    into v_coupon_reserved
  from public.ticket_coupons c
  where c.ticket_type_id = p_ticket_type_id
    and c.status = 'active';

  v_available := greatest(0, v_ticket_type.quantity - v_reserved - v_coupon_reserved);

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
