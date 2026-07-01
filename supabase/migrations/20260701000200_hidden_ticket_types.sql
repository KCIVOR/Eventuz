-- Hidden ticket types are valid internally but excluded from public checkout.

alter table public.ticket_types drop constraint if exists ticket_types_status_check;

alter table public.ticket_types
  add constraint ticket_types_status_check check (
    status in ('active', 'hidden', 'inactive', 'sold_out')
  );

-- Recreate coupon creation to allow active and hidden ticket types.
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

  if v_ticket_type.status not in ('active', 'hidden') then
    raise exception 'Coupons can only be created for active or hidden ticket types.';
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
