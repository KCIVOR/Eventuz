-- Super Admin: account / event suspension RPCs (no organizer content edits).
-- Also: scanning blocked while event.status = 'disabled'.

-- ---------------------------------------------------------------------------
-- super_admin_set_user_account_status
-- ---------------------------------------------------------------------------
create or replace function public.super_admin_set_user_account_status (
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
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
end;
$$;

grant execute on function public.super_admin_set_user_account_status (uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- super_admin_set_event_registration_blocked
-- Blocks new purchases the same way as organizer "disabled" (not published).
-- Unblock sets status to draft so the organizer can review and publish again.
-- ---------------------------------------------------------------------------
create or replace function public.super_admin_set_event_registration_blocked (
  p_event_id uuid,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path = public
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
  else
    if st = 'disabled' then
      update public.events
      set
        status = 'draft',
        updated_at = now ()
      where id = p_event_id;
    end if;
  end if;
end;
$$;

grant execute on function public.super_admin_set_event_registration_blocked (uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- process_ticket_scan: reject when platform disabled the event
-- ---------------------------------------------------------------------------
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
