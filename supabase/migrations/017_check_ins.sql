-- Check-in audit log + atomic scan / validate / ticket update (SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- check_ins
-- ---------------------------------------------------------------------------
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid (),
  ticket_id uuid references public.tickets (id) on delete set null,
  event_id uuid not null references public.events (id) on delete cascade,
  scanned_by_user_id uuid not null references auth.users (id) on delete cascade,
  scan_result text not null
    check (scan_result in ('valid', 'duplicate', 'invalid', 'voided')),
  scanned_at timestamptz not null default now (),
  device_info jsonb
);

create index if not exists check_ins_event_id_scanned_at_idx
  on public.check_ins (event_id, scanned_at desc);

create index if not exists check_ins_ticket_id_idx on public.check_ins (ticket_id);

-- ---------------------------------------------------------------------------
-- RLS: read-only for organizers / assigned staff / super admin; writes via RPC only
-- ---------------------------------------------------------------------------
alter table public.check_ins enable row level security;

drop policy if exists "check_ins_select_organizer" on public.check_ins;
create policy "check_ins_select_organizer"
  on public.check_ins for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = check_ins.event_id
        and e.organizer_id = auth.uid ()
    )
  );

drop policy if exists "check_ins_select_staff" on public.check_ins;
create policy "check_ins_select_staff"
  on public.check_ins for select to authenticated
  using (
    exists (
      select 1 from public.event_staff es
      where es.event_id = check_ins.event_id
        and es.user_id = auth.uid ()
        and es.status = 'active'
    )
  );

drop policy if exists "check_ins_select_super" on public.check_ins;
create policy "check_ins_select_super"
  on public.check_ins for select to authenticated
  using (public.is_super_admin ());

-- ---------------------------------------------------------------------------
-- process_ticket_scan: verify scanner role + event access, validate QR / code, log, check in
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
    -- staff
    if not exists (
      select 1 from public.event_staff es
      where es.event_id = p_event_id
        and es.user_id = v_uid
        and es.status = 'active'
    ) then
      raise exception 'Not allowed to scan for this event.';
    end if;
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

  -- Strip app prefix if present
  if starts_with(v_trim, 'eventuz:v2:') then
    v_pl := substring(v_trim from 12);
  else
    v_pl := v_trim;
  end if;

  -- Try signed payload: ticket_uuid.ticket_code.hmac_hex
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
