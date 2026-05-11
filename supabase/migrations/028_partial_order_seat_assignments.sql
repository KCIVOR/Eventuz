-- Partial seat assignment: save 1..quantity seats per submit; order becomes partially_assigned until full.

create or replace function public.submit_order_seat_assignments (
  p_order_id uuid,
  p_assignments jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  rec record;
  n int;
  i int;
  j int;
  item jsonb;
  sid uuid;
  aname text;
  aemail text;
  seat_rec record;
  seen uuid[] := array[]::uuid[];
  uid uuid := auth.uid ();
  p_seats uuid[] := '{}';
  p_names text[] := '{}';
  p_emails text[] := '{}';
  sa_id uuid;
  assigned_cnt int;
begin
  if uid is null then
    raise exception 'Authentication required.';
  end if;

  if jsonb_typeof (p_assignments) is distinct from 'array' then
    raise exception 'Assignments must be a JSON array.';
  end if;

  n := coalesce (jsonb_array_length (p_assignments), 0);

  select * into strict rec from public.orders where id = p_order_id for update;

  if rec.buyer_user_id is distinct from uid then
    raise exception 'You can only assign seats for your own orders.';
  end if;

  if rec.status not in ('paid_unassigned', 'partially_assigned') then
    raise exception 'This order does not accept seat assignment right now.';
  end if;

  if n < 1 or n > rec.quantity then
    raise exception 'Assign between 1 and % seat(s) per save.', rec.quantity;
  end if;

  if exists (
    select 1
    from public.tickets tk
    where tk.order_id = p_order_id
      and tk.status is distinct from 'voided'
    limit 1
  ) then
    raise exception 'Tickets already issued for this order; seats are locked.';
  end if;

  -- Validate payload and collect rows (same order as JSON array).
  for i in 0 .. n - 1 loop
    item := p_assignments -> i;
    sid := nullif (trim (item ->> 'seat_id'), '')::uuid;
    aname := trim (item ->> 'attendee_name');
    aemail := trim (lower (coalesce (item ->> 'attendee_email', '')));

    if sid is null or aname = '' or aemail = '' then
      raise exception 'Each seat needs an attendee name and email.';
    end if;

    if aemail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'Invalid attendee email for one or more seats.';
    end if;

    if sid = any (seen) then
      raise exception 'The same seat cannot be selected twice.';
    end if;
    seen := array_append (seen, sid);

    select * into strict seat_rec from public.seats where id = sid;

    if seat_rec.event_id is distinct from rec.event_id
      or seat_rec.ticket_type_id is distinct from rec.ticket_type_id then
      raise exception 'Seats must belong to the ticket type you purchased.';
    end if;

    p_seats := array_append (p_seats, sid);
    p_names := array_append (p_names, aname);
    p_emails := array_append (p_emails, aemail);
  end loop;

  -- Drop assignments removed from this save; release those seats.
  update public.seats s
  set
    status = 'available',
    updated_at = now ()
  where s.id in (
    select sa.seat_id
    from public.seat_assignments sa
    where sa.order_id = p_order_id
      and sa.status in ('assigned', 'ticket_issued')
      and sa.seat_id not in (select unnest (p_seats))
  );

  update public.seat_assignments sa
  set
    status = 'cancelled',
    updated_at = now ()
  where sa.order_id = p_order_id
    and sa.status in ('assigned', 'ticket_issued')
    and sa.seat_id not in (select unnest (p_seats));

  -- Upsert each requested seat (update existing for this order; otherwise insert).
  for j in 1 .. n loop
    sid := p_seats[j];
    aname := p_names[j];
    aemail := p_emails[j];

    select sa.id into sa_id
    from public.seat_assignments sa
    where sa.order_id = p_order_id
      and sa.seat_id = sid
      and sa.status in ('assigned', 'ticket_issued')
    limit 1;

    if sa_id is not null then
      update public.seat_assignments
      set
        attendee_name = aname,
        attendee_email = aemail,
        updated_at = now ()
      where id = sa_id;
    else
      select * into strict seat_rec from public.seats where id = sid for update;

      if seat_rec.event_id is distinct from rec.event_id
        or seat_rec.ticket_type_id is distinct from rec.ticket_type_id then
        raise exception 'Seats must belong to the ticket type you purchased.';
      end if;

      if exists (
        select 1
        from public.seat_assignments sa
        where sa.seat_id = sid
          and sa.status in ('assigned', 'ticket_issued')
          and sa.order_id is distinct from p_order_id
      ) then
        raise exception 'Seat % is already assigned.', seat_rec.display_label;
      end if;

      if seat_rec.status is distinct from 'available' then
        raise exception 'Seat % is not available.', seat_rec.display_label;
      end if;

      insert into public.seat_assignments (
        order_id,
        seat_id,
        attendee_name,
        attendee_email,
        assigned_by_user_id,
        status
      )
      values (p_order_id, sid, aname, aemail, uid, 'assigned');

      update public.seats
      set
        status = 'assigned',
        updated_at = now ()
      where id = sid;
    end if;
  end loop;

  select count(*)::int into assigned_cnt
  from public.seat_assignments
  where order_id = p_order_id
    and status in ('assigned', 'ticket_issued');

  if assigned_cnt >= rec.quantity then
    update public.orders
    set
      status = 'completed',
      updated_at = now ()
    where id = p_order_id;
  elsif assigned_cnt > 0 then
    update public.orders
    set
      status = 'partially_assigned',
      updated_at = now ()
    where id = p_order_id;
  else
    raise exception 'Seat assignment did not persist; try again.';
  end if;

  perform public.write_audit_log (
    'seat.assigned',
    'order',
    p_order_id,
    jsonb_build_object (
      'assignment_count', assigned_cnt,
      'payload_count', n,
      'event_id', rec.event_id,
      'order_completed', assigned_cnt >= rec.quantity
    ),
    null
  );
end;
$$;
