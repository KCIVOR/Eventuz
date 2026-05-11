-- Instrument critical paths to append audit_logs (022). Safe metadata only (no raw QR, passwords, full webhooks).

create or replace function public.expire_stale_unpaid_orders ()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  with cap as (
    update public.orders o
    set
      status = 'expired',
      updated_at = now ()
    where o.status = 'capacity_held'
      and o.capacity_hold_expires_at < now ()
    returning o.id, o.event_id, o.buyer_user_id
  )
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  select
    null,
    'capacity_hold.expired',
    'order',
    id,
    jsonb_build_object ('event_id', event_id, 'buyer_user_id', buyer_user_id)
  from cap;

  with pay as (
    update public.orders o
    set
      status = 'expired',
      updated_at = now ()
    where o.status = 'payment_pending'
      and o.payment_expires_at < now ()
    returning o.id, o.event_id, o.buyer_user_id
  )
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  select
    null,
    'payment_hold.expired',
    'order',
    id,
    jsonb_build_object ('event_id', event_id, 'buyer_user_id', buyer_user_id)
  from pay;

  update public.orders o
  set
    unit_price_locked = tt.regular_price,
    total_amount = round((tt.regular_price * o.quantity::numeric), 2),
    pricing_type = 'regular',
    early_bird_price_expires_at = null,
    updated_at = now ()
  from public.ticket_types tt
  where o.ticket_type_id = tt.id
    and o.status in ('capacity_held', 'payment_pending')
    and o.pricing_type = 'early_bird'
    and o.early_bird_price_expires_at is not null
    and o.early_bird_price_expires_at < now ()
    and (
      (
        o.status = 'capacity_held'
        and o.capacity_hold_expires_at >= now ()
      )
      or (
        o.status = 'payment_pending'
        and o.payment_expires_at >= now ()
      )
    );
end;
$$;

grant execute on function public.expire_stale_unpaid_orders () to anon;

grant execute on function public.expire_stale_unpaid_orders () to authenticated;

grant execute on function public.expire_stale_unpaid_orders () to service_role;

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
    from public.seat_assignments sa
    where sa.order_id = p_order_id
      and sa.status = 'assigned'
    order by sa.created_at
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

grant execute on function public.issue_qr_tickets_for_order (uuid) to authenticated;

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
  item jsonb;
  sid uuid;
  aname text;
  aemail text;
  seat_rec record;
  seen uuid[] := array[]::uuid[];
  uid uuid := auth.uid ();
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

  if n is distinct from rec.quantity then
    raise exception 'You must assign exactly % seat(s) for this order.', rec.quantity;
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

  update public.seats s
  set status = 'available'
  from public.seat_assignments sa
  where sa.seat_id = s.id
    and sa.order_id = p_order_id
    and sa.status in ('assigned', 'ticket_issued');

  update public.seat_assignments
  set status = 'cancelled', updated_at = now ()
  where order_id = p_order_id
    and status in ('assigned', 'ticket_issued');

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

    select * into strict seat_rec from public.seats where id = sid for update;

    if seat_rec.event_id is distinct from rec.event_id
      or seat_rec.ticket_type_id is distinct from rec.ticket_type_id then
      raise exception 'Seats must belong to the ticket type you purchased.';
    end if;

    if seat_rec.status is distinct from 'available' then
      raise exception 'Seat % is not available.', seat_rec.display_label;
    end if;

    if exists (
      select 1 from public.seat_assignments sa
      where sa.seat_id = sid
        and sa.status in ('assigned', 'ticket_issued')
    ) then
      raise exception 'Seat % is already assigned.', seat_rec.display_label;
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

    update public.seats set status = 'assigned' where id = sid;
  end loop;

  perform public.write_audit_log (
    'seat.assigned',
    'order',
    p_order_id,
    jsonb_build_object ('assignment_count', n, 'event_id', rec.event_id),
    null
  );

  update public.orders
  set status = 'completed', updated_at = now ()
  where id = p_order_id;
end;
$$;

grant execute on function public.submit_order_seat_assignments (uuid, jsonb) to authenticated;

create or replace function public.super_admin_set_user_account_status (
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_cnt int;
begin
  if auth.uid () is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_super_admin () then
    raise exception 'Not allowed.';
  end if;

  if p_status is distinct from 'active' and p_status is distinct from 'disabled' then
    raise exception 'Invalid status.';
  end if;

  if p_user_id = auth.uid () and p_status = 'disabled' then
    raise exception 'Use another super admin account to disable yourself.';
  end if;

  if p_status = 'disabled' then
    if exists (
      select 1 from public.profiles p
      where p.id = p_user_id and p.role = 'super_admin'
    ) then
      select count(*)::int into v_cnt
      from public.profiles p
      where p.role = 'super_admin'
        and p.status = 'active';

      if v_cnt <= 1 then
        raise exception 'Cannot disable the last active super admin.';
      end if;
    end if;
  end if;

  update public.profiles
  set
    status = p_status,
    updated_at = now ()
  where id = p_user_id;

  if not found then
    raise exception 'User not found.';
  end if;

  perform public.write_audit_log (
    case
      when p_status = 'disabled' then 'user.disabled'
      else 'user.enabled'
    end,
    'user',
    p_user_id,
    '{}'::jsonb,
    null
  );
end;
$$;

grant execute on function public.super_admin_set_user_account_status (uuid, text) to authenticated;

create or replace function public.super_admin_set_event_registration_blocked (
  p_event_id uuid,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  st text;
begin
  if auth.uid () is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_super_admin () then
    raise exception 'Not allowed.';
  end if;

  select e.status into strict st
  from public.events e
  where e.id = p_event_id;

  if p_blocked then
    update public.events
    set
      status = 'disabled',
      updated_at = now ()
    where id = p_event_id;

    perform public.write_audit_log (
      'event.disabled',
      'event',
      p_event_id,
      jsonb_build_object ('source', 'super_admin'),
      null
    );
  else
    if st = 'disabled' then
      update public.events
      set
        status = 'draft',
        updated_at = now ()
      where id = p_event_id;

      perform public.write_audit_log (
        'event.restored',
        'event',
        p_event_id,
        jsonb_build_object ('source', 'super_admin', 'status', 'draft'),
        null
      );
    end if;
  end if;
end;
$$;

grant execute on function public.super_admin_set_event_registration_blocked (uuid, boolean) to authenticated;

create or replace function public.process_ticket_scan (
  p_event_id uuid,
  p_scan_raw text,
  p_device_info jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_uid uuid := auth.uid ();
  v_role text;
  v_event_status text;
  v_trim text := trim(coalesce(p_scan_raw, ''));
  v_pl text;
  v_parts text[];
  v_tid uuid;
  v_code_from_payload text;
  v_sig_hex text;
  sk bytea;
  v_ep bigint;
  v_msg bytea;
  v_sig bytea;
  v_expected_hex text;
  tk public.tickets%rowtype;
  has_tk boolean := false;
  v_manual_code text;
  v_updated int;
  v_check_id uuid;
  v_scan_result text;
  v_att_name text;
  v_tcode text;
  v_ticket_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  select p.role into strict v_role from public.profiles p where p.id = v_uid;

  if v_role is distinct from 'super_admin'
    and v_role is distinct from 'organizer'
    and v_role is distinct from 'staff' then
    raise exception 'Not allowed to scan tickets.';
  end if;

  if v_role = 'super_admin' then
    null;
  elsif v_role = 'organizer' then
    if not exists (
      select 1 from public.events e
      where e.id = p_event_id and e.organizer_id = v_uid
    ) then
      raise exception 'Not allowed to scan for this event.';
    end if;
  else
    if not exists (
      select 1 from public.event_staff es
      where es.event_id = p_event_id
        and es.user_id = v_uid
        and es.status = 'active'
    ) then
      raise exception 'Not allowed to scan for this event.';
    end if;
  end if;

  select e.status into strict v_event_status
  from public.events e
  where e.id = p_event_id;

  if v_event_status = 'disabled' then
    raise exception 'This event is disabled. Scanning is not available.';
  end if;

  if v_trim = '' then
    insert into public.check_ins (
      ticket_id, event_id, scanned_by_user_id, scan_result, device_info
    )
    values (null, p_event_id, v_uid, 'invalid', p_device_info)
    returning id into v_check_id;
    return jsonb_build_object(
      'scan_result', 'invalid',
      'check_in_id', v_check_id,
      'ticket_id', null,
      'attendee_name', null,
      'ticket_code', null
    );
  end if;

  if starts_with(v_trim, 'eventuz:v2:') then
    v_pl := substring(v_trim from 12);
  else
    v_pl := v_trim;
  end if;

  v_parts := string_to_array(v_pl, '.');
  if array_length(v_parts, 1) = 3 then
    begin
      v_tid := v_parts[1]::uuid;
    exception
      when others then
        v_tid := null;
    end;
    v_code_from_payload := v_parts[2];
    v_sig_hex := v_parts[3];
    if v_tid is not null
      and v_code_from_payload is not null
      and v_code_from_payload <> ''
      and length(v_sig_hex) = 64
      and v_sig_hex ~ '^[0-9a-fA-F]+$' then
      select * into tk
      from public.tickets t
      where t.id = v_tid
        and t.event_id = p_event_id;
      if found and v_code_from_payload is not distinct from tk.ticket_code then
        select k.secret_key into strict sk
        from private.ticket_signing_key k
        where k.id = 1;
        v_ep := floor(extract(epoch from tk.issued_at))::bigint;
        v_msg :=
          convert_to(
            tk.id::text || '|' || tk.ticket_code || '|' || v_ep::text,
            'UTF8'
          );
        v_sig := extensions.hmac(v_msg, sk, 'sha256');
        v_expected_hex := encode(v_sig, 'hex');
        if lower(v_expected_hex) = lower(v_sig_hex) then
          has_tk := true;
        end if;
      end if;
    end if;
  end if;

  if not has_tk then
    v_manual_code := upper(v_trim);
    if v_manual_code !~ '^EVZ-[A-F0-9]{8}$' then
      v_manual_code := upper(v_pl);
    end if;
    if v_manual_code ~ '^EVZ-[A-F0-9]{8}$' then
      select * into tk
      from public.tickets t
      where t.ticket_code = v_manual_code
        and t.event_id = p_event_id;
      has_tk := found;
    end if;
  end if;

  if not has_tk then
    insert into public.check_ins (
      ticket_id, event_id, scanned_by_user_id, scan_result, device_info
    )
    values (null, p_event_id, v_uid, 'invalid', p_device_info)
    returning id into v_check_id;
    return jsonb_build_object(
      'scan_result', 'invalid',
      'check_in_id', v_check_id,
      'ticket_id', null,
      'attendee_name', null,
      'ticket_code', null
    );
  end if;

  v_att_name := tk.attendee_name;
  v_tcode := tk.ticket_code;

  if tk.status = 'voided' then
    insert into public.check_ins (
      ticket_id, event_id, scanned_by_user_id, scan_result, device_info
    )
    values (tk.id, p_event_id, v_uid, 'voided', p_device_info)
    returning id into v_check_id;
    return jsonb_build_object(
      'scan_result', 'voided',
      'check_in_id', v_check_id,
      'ticket_id', tk.id,
      'attendee_name', v_att_name,
      'ticket_code', v_tcode
    );
  end if;

  if tk.status = 'checked_in' then
    insert into public.check_ins (
      ticket_id, event_id, scanned_by_user_id, scan_result, device_info
    )
    values (tk.id, p_event_id, v_uid, 'duplicate', p_device_info)
    returning id into v_check_id;
    perform public.write_audit_log (
      'scan.duplicate_attempt',
      'ticket',
      tk.id,
      jsonb_build_object ('event_id', p_event_id, 'ticket_code', v_tcode, 'check_in_id', v_check_id),
      null
    );
    return jsonb_build_object(
      'scan_result', 'duplicate',
      'check_in_id', v_check_id,
      'ticket_id', tk.id,
      'attendee_name', v_att_name,
      'ticket_code', v_tcode
    );
  end if;

  if tk.status is distinct from 'issued' then
    insert into public.check_ins (
      ticket_id, event_id, scanned_by_user_id, scan_result, device_info
    )
    values (tk.id, p_event_id, v_uid, 'invalid', p_device_info)
    returning id into v_check_id;
    return jsonb_build_object(
      'scan_result', 'invalid',
      'check_in_id', v_check_id,
      'ticket_id', tk.id,
      'attendee_name', v_att_name,
      'ticket_code', v_tcode
    );
  end if;

  update public.tickets
  set
    status = 'checked_in',
    checked_in_at = now (),
    updated_at = now ()
  where id = tk.id
    and status = 'issued';
  get diagnostics v_updated = row_count;

  if v_updated = 1 then
    v_scan_result := 'valid';
  else
    select t.status into strict v_ticket_status from public.tickets t where t.id = tk.id;
    if v_ticket_status = 'checked_in' then
      v_scan_result := 'duplicate';
    else
      v_scan_result := 'invalid';
    end if;
  end if;

  insert into public.check_ins (
    ticket_id, event_id, scanned_by_user_id, scan_result, device_info
  )
  values (tk.id, p_event_id, v_uid, v_scan_result, p_device_info)
  returning id into v_check_id;

  if v_scan_result = 'valid' then
    perform public.write_audit_log (
      'ticket.checked_in',
      'ticket',
      tk.id,
      jsonb_build_object ('event_id', p_event_id, 'ticket_code', v_tcode, 'check_in_id', v_check_id),
      null
    );
  elsif v_scan_result = 'duplicate' then
    perform public.write_audit_log (
      'scan.duplicate_attempt',
      'ticket',
      tk.id,
      jsonb_build_object ('event_id', p_event_id, 'ticket_code', v_tcode, 'check_in_id', v_check_id),
      null
    );
  end if;

  return jsonb_build_object(
    'scan_result', v_scan_result,
    'check_in_id', v_check_id,
    'ticket_id', tk.id,
    'attendee_name', v_att_name,
    'ticket_code', v_tcode
  );
end;
$$;

grant execute on function public.process_ticket_scan (uuid, text, jsonb) to authenticated;