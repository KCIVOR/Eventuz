-- Phase: QR tickets after payment + full seat assignment (hashed validation secret + human ticket_code).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Signing material (never exposed via RLS; only SECURITY DEFINER helpers)
-- ---------------------------------------------------------------------------
create schema if not exists private;

create table if not exists private.ticket_signing_key (
  id smallint primary key check (id = 1),
  secret_key bytea not null
);

insert into private.ticket_signing_key (id, secret_key)
select 1, extensions.gen_random_bytes (32)
where not exists (select 1 from private.ticket_signing_key where id = 1);

revoke all on table private.ticket_signing_key from public;

-- ---------------------------------------------------------------------------
-- Tickets
-- ---------------------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  seat_assignment_id uuid not null references public.seat_assignments (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  seat_id uuid not null references public.seats (id) on delete restrict,
  attendee_name text not null,
  attendee_email text not null,
  qr_token_hash text not null,
  ticket_code text not null,
  status text not null default 'issued'
    check (status in ('issued', 'checked_in', 'voided')),
  issued_at timestamptz not null default now (),
  emailed_at timestamptz,
  checked_in_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  unique (ticket_code),
  unique (seat_assignment_id)
);

create index if not exists tickets_order_id_idx on public.tickets (order_id);
create index if not exists tickets_event_id_idx on public.tickets (event_id);
create index if not exists tickets_ticket_type_id_idx on public.tickets (ticket_type_id);
create index if not exists tickets_seat_id_idx on public.tickets (seat_id);
create index if not exists tickets_status_idx on public.tickets (status);

drop trigger if exists set_tickets_updated_at on public.tickets;
create trigger set_tickets_updated_at
  before update on public.tickets
  for each row execute procedure public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tickets enable row level security;

drop policy if exists "tickets_select_buyer" on public.tickets;
create policy "tickets_select_buyer"
  on public.tickets for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = tickets.order_id and o.buyer_user_id = auth.uid ()
    )
  );

drop policy if exists "tickets_select_organizer" on public.tickets;
create policy "tickets_select_organizer"
  on public.tickets for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = tickets.order_id
        and e.organizer_id = auth.uid ()
    )
  );

drop policy if exists "tickets_select_super" on public.tickets;
create policy "tickets_select_super"
  on public.tickets for select to authenticated
  using (public.is_super_admin ());

-- ---------------------------------------------------------------------------
-- Internal: deterministic QR bearer (HMAC); qr_token_hash = sha256(payload)
-- ---------------------------------------------------------------------------
create or replace function public._build_ticket_qr_payload (
  p_ticket_id uuid,
  p_ticket_code text,
  p_issued_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  sk bytea;
  ep bigint;
  msg bytea;
  sig bytea;
begin
  select k.secret_key into strict sk from private.ticket_signing_key k where k.id = 1;
  ep := floor (extract (epoch from p_issued_at))::bigint;
  msg :=
    convert_to (
      p_ticket_id::text || '|' || p_ticket_code || '|' || ep::text,
      'UTF8'
    );
  sig := extensions.hmac (msg, sk, 'sha256');
  return p_ticket_id::text || '.' || p_ticket_code || '.' || encode (sig, 'hex');
end;
$$;

revoke all on function public._build_ticket_qr_payload (uuid, text, timestamptz) from public;

-- Authenticated callers: payload for rendering QR (buyer or organizer for that event).
create or replace function public.ticket_qr_payload (p_ticket_id uuid)
returns text
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  t record;
  pl text;
  h text;
begin
  if auth.uid () is null then
    raise exception 'Authentication required.';
  end if;

  select
    tk.id,
    tk.order_id,
    tk.ticket_code,
    tk.issued_at,
    tk.qr_token_hash,
    tk.status
  into strict t
  from public.tickets tk
  where tk.id = p_ticket_id;

  if t.status = 'voided' then
    raise exception 'This ticket is voided.';
  end if;

  if not exists (
    select 1
    from public.orders o
    left join public.events e on e.id = o.event_id
    where o.id = t.order_id
      and (
        o.buyer_user_id = auth.uid ()
        or e.organizer_id = auth.uid ()
      )
  )
  and not public.is_super_admin () then
    raise exception 'Not allowed to view this ticket.';
  end if;

  pl := public._build_ticket_qr_payload (t.id, t.ticket_code, t.issued_at);
  h := encode (extensions.digest (convert_to (pl, 'UTF8'), 'sha256'), 'hex');

  if h is distinct from t.qr_token_hash then
    raise exception 'Ticket QR integrity check failed.';
  end if;

  return pl;
end;
$$;

grant execute on function public.ticket_qr_payload (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Issue one row per assigned seat_assignment; mark assignments ticket_issued
-- ---------------------------------------------------------------------------
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
end;
$$;

grant execute on function public.issue_qr_tickets_for_order (uuid) to authenticated;

-- Backwards-compatible name used by the app.
create or replace function public.issue_admission_tickets_for_order (p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  perform public.issue_qr_tickets_for_order (p_order_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Seat reassignment guard: use tickets instead of admission_tickets
-- ---------------------------------------------------------------------------
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

  update public.orders
  set status = 'completed', updated_at = now ()
  where id = p_order_id;
end;
$$;
