-- Enrich scanner results with operational ticket, attendee, event, ticket type, and seat details.

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
  v_details jsonb;
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
      'order_id', null,
      'ticket_type_id', null,
      'ticket_type_name', null,
      'seat_id', null,
      'seat_display_label', null,
      'seat_label', null,
      'table_label', null,
      'seat_status', null,
      'attendee_name', null,
      'attendee_email', null,
      'ticket_code', null,
      'ticket_status', null,
      'issued_at', null,
      'checked_in_at', null,
      'event_name', null,
      'event_date', null,
      'event_time', null,
      'venue', null
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
      'order_id', null,
      'ticket_type_id', null,
      'ticket_type_name', null,
      'seat_id', null,
      'seat_display_label', null,
      'seat_label', null,
      'table_label', null,
      'seat_status', null,
      'attendee_name', null,
      'attendee_email', null,
      'ticket_code', null,
      'ticket_status', null,
      'issued_at', null,
      'checked_in_at', null,
      'event_name', null,
      'event_date', null,
      'event_time', null,
      'venue', null
    );
  end if;

  v_att_name := tk.attendee_name;
  v_tcode := tk.ticket_code;

  if tk.status = 'voided' then
    v_scan_result := 'voided';
    insert into public.check_ins (
      ticket_id, event_id, scanned_by_user_id, scan_result, device_info
    )
    values (tk.id, p_event_id, v_uid, v_scan_result, p_device_info)
    returning id into v_check_id;
  elsif tk.status = 'checked_in' then
    v_scan_result := 'duplicate';
    insert into public.check_ins (
      ticket_id, event_id, scanned_by_user_id, scan_result, device_info
    )
    values (tk.id, p_event_id, v_uid, v_scan_result, p_device_info)
    returning id into v_check_id;
    perform public.write_audit_log (
      'scan.duplicate_attempt',
      'ticket',
      tk.id,
      jsonb_build_object ('event_id', p_event_id, 'ticket_code', v_tcode, 'check_in_id', v_check_id),
      null
    );
  elsif tk.status is distinct from 'issued' then
    v_scan_result := 'invalid';
    insert into public.check_ins (
      ticket_id, event_id, scanned_by_user_id, scan_result, device_info
    )
    values (tk.id, p_event_id, v_uid, v_scan_result, p_device_info)
    returning id into v_check_id;
  else
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
  end if;

  select jsonb_build_object(
    'ticket_id', t.id,
    'order_id', t.order_id,
    'ticket_type_id', t.ticket_type_id,
    'ticket_type_name', tt.name,
    'seat_id', t.seat_id,
    'seat_display_label', s.display_label,
    'seat_label', s.seat_label,
    'table_label', s.table_label,
    'seat_status', s.status,
    'attendee_name', t.attendee_name,
    'attendee_email', t.attendee_email,
    'ticket_code', t.ticket_code,
    'ticket_status', t.status,
    'issued_at', t.issued_at,
    'checked_in_at', t.checked_in_at,
    'event_name', e.name,
    'event_date', e.event_date,
    'event_time', e.event_time,
    'venue', e.venue
  )
  into v_details
  from public.tickets t
  join public.events e on e.id = t.event_id
  left join public.ticket_types tt on tt.id = t.ticket_type_id
  left join public.seats s on s.id = t.seat_id
  where t.id = tk.id;

  return jsonb_build_object(
    'scan_result', v_scan_result,
    'check_in_id', v_check_id
  ) || coalesce(v_details, '{}'::jsonb);
end;
$$;

grant execute on function public.process_ticket_scan (uuid, text, jsonb) to authenticated;
