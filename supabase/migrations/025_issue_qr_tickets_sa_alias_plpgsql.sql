-- PL/pgSQL: loop variable `sa` matched the FROM alias `sa`, so `sa.order_id` in the
-- cursor query resolved to the uninitialized record → "record \"sa\" is not assigned yet".
-- Use a distinct table alias.

create or replace function public.issue_qr_tickets_for_order (p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  rec record;
  inserted int := 0;
  sa record;
  t_id uuid;
  t_code text;
  t_issued timestamptz;
  pl text;
  thash text;
  tries int;
begin
  if auth.uid () is null then
    raise exception 'Authentication required.';
  end if;

  select * into strict rec from public.orders where id = p_order_id for update;

  if rec.buyer_user_id is distinct from auth.uid () then
    raise exception 'Not allowed to issue tickets for this order.';
  end if;

  if rec.status is distinct from 'completed' then
    raise exception 'Order must be completed with seats assigned before tickets can be issued.';
  end if;

  if exists (
    select 1 from public.tickets tk where tk.order_id = p_order_id and tk.status is distinct from 'voided' limit 1
  ) then
    return;
  end if;

  for sa in
    select *
    from public.seat_assignments asn
    where asn.order_id = p_order_id
      and asn.status = 'assigned'
    order by asn.created_at
  loop
    t_id := gen_random_uuid ();
    t_issued := clock_timestamp ();
    tries := 0;
    loop
      t_code :=
        'EVZ-'
        || upper (
          substr (replace (gen_random_uuid ()::text, '-', ''), 1, 8)
        );
      tries := tries + 1;
      exit when not exists (
        select 1 from public.tickets tk where tk.ticket_code = t_code limit 1
      );
      if tries > 12 then
        raise exception 'Could not allocate a unique ticket code.';
      end if;
    end loop;

    pl := public._build_ticket_qr_payload (t_id, t_code, t_issued);
    thash := encode (extensions.digest (convert_to (pl, 'UTF8'), 'sha256'), 'hex');

    insert into public.tickets (
      id,
      order_id,
      seat_assignment_id,
      event_id,
      ticket_type_id,
      seat_id,
      attendee_name,
      attendee_email,
      qr_token_hash,
      ticket_code,
      status,
      issued_at,
      emailed_at,
      checked_in_at
    )
    values (
      t_id,
      p_order_id,
      sa.id,
      rec.event_id,
      rec.ticket_type_id,
      sa.seat_id,
      sa.attendee_name,
      sa.attendee_email,
      thash,
      t_code,
      'issued',
      t_issued,
      null,
      null
    );

    inserted := inserted + 1;
  end loop;

  if inserted is distinct from rec.quantity then
    raise exception 'Seat assignments must all be assigned before issuing tickets (expected %, got %).', rec.quantity, inserted;
  end if;

  update public.seat_assignments
  set status = 'ticket_issued', updated_at = now ()
  where order_id = p_order_id
    and status = 'assigned';

  perform public.write_audit_log (
    'ticket.qr_issued',
    'order',
    p_order_id,
    jsonb_build_object (
      'ticket_count', inserted,
      'event_id', rec.event_id
    ),
    null
  );
end;
$$;
