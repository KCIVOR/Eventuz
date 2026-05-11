-- Seat assignments: post-payment exact seats + guest details (no QR/email here).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.seat_assignments (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  seat_id uuid not null references public.seats (id) on delete restrict,
  attendee_name text not null,
  attendee_email text not null,
  assigned_by_user_id uuid not null references auth.users (id) on delete restrict,
  status text not null
    check (status in ('assigned', 'ticket_issued', 'cancelled')),
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists seat_assignments_order_id_idx on public.seat_assignments (order_id);

create unique index if not exists seat_assignments_one_active_per_seat
  on public.seat_assignments (seat_id)
  where status in ('assigned', 'ticket_issued');

drop trigger if exists set_seat_assignments_updated_at on public.seat_assignments;
create trigger set_seat_assignments_updated_at
  before update on public.seat_assignments
  for each row execute procedure public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.seat_assignments enable row level security;

drop policy if exists "seat_assignments_select_buyer_own_order" on public.seat_assignments;
create policy "seat_assignments_select_buyer_own_order"
  on public.seat_assignments for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = seat_assignments.order_id
        and o.buyer_user_id = auth.uid ()
    )
  );

drop policy if exists "seat_assignments_select_organizer" on public.seat_assignments;
create policy "seat_assignments_select_organizer"
  on public.seat_assignments for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = seat_assignments.order_id
        and e.organizer_id = auth.uid ()
    )
  );

drop policy if exists "seat_assignments_select_super" on public.seat_assignments;
create policy "seat_assignments_select_super"
  on public.seat_assignments for select to authenticated
  using (public.is_super_admin ());

-- Writes go through submit_order_seat_assignments (security definer).

-- ---------------------------------------------------------------------------
-- Submit all seats in one transaction; order -> completed
-- ---------------------------------------------------------------------------
create or replace function public.submit_order_seat_assignments (
  p_order_id uuid,
  p_assignments jsonb
)
returns void
language plpgsql
security definer
set search_path = public
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
    select 1 from public.admission_tickets t where t.order_id = p_order_id limit 1
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
  set status = 'cancelled', updated_at = now()
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

grant execute on function public.submit_order_seat_assignments (uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Admission issuance: use explicit seat_assignments after order is completed
-- ---------------------------------------------------------------------------
create or replace function public.issue_admission_tickets_for_order (p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  inserted int;
begin
  select * into strict rec from public.orders where id = p_order_id for update;

  if rec.buyer_user_id is distinct from auth.uid () then
    raise exception 'Not allowed to issue tickets for this order.';
  end if;

  if rec.status is distinct from 'completed' then
    raise exception 'Complete seat assignment before tickets can be issued.';
  end if;

  if exists (
    select 1 from public.admission_tickets t where t.order_id = p_order_id limit 1
  ) then
    return;
  end if;

  insert into public.admission_tickets (order_id, seat_id)
  select sa.order_id, sa.seat_id
  from public.seat_assignments sa
  where sa.order_id = p_order_id
    and sa.status = 'assigned';

  get diagnostics inserted = row_count;

  if coalesce (inserted, 0) is distinct from rec.quantity then
    raise exception 'Seat assignments missing or incomplete for this order.';
  end if;

  update public.seat_assignments
  set status = 'ticket_issued', updated_at = now ()
  where order_id = p_order_id
    and status = 'assigned';
end;
$$;
