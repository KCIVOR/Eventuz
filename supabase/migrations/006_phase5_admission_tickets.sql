-- Phase 5: QR admission tickets (after payment). Seat assignment on issue; display-only until Phase 4 webhook sets paid.
--
-- Use gen_random_uuid() for qr_token default (no pgcrypto / gen_random_bytes required).

-- ---------------------------------------------------------------------------
-- Orders: paid
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders add constraint orders_status_check check (
  status in (
    'capacity_held',
    'payment_pending',
    'expired',
    'cancelled',
    'payment_failed',
    'paid'
  )
);

-- ---------------------------------------------------------------------------
-- Admission tickets
-- ---------------------------------------------------------------------------
create table if not exists public.admission_tickets (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  seat_id uuid not null references public.seats (id) on delete restrict,
  qr_token text not null unique default (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  created_at timestamptz not null default now (),
  unique (order_id, seat_id)
);

create index if not exists admission_tickets_order_id_idx on public.admission_tickets (order_id);
create index if not exists admission_tickets_seat_id_idx on public.admission_tickets (seat_id);
create index if not exists admission_tickets_qr_token_idx on public.admission_tickets (qr_token);

alter table public.admission_tickets enable row level security;

drop policy if exists "admission_tickets_select_buyer" on public.admission_tickets;
create policy "admission_tickets_select_buyer"
  on public.admission_tickets for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = admission_tickets.order_id and o.buyer_user_id = auth.uid ()
    )
  );

drop policy if exists "admission_tickets_select_organizer" on public.admission_tickets;
create policy "admission_tickets_select_organizer"
  on public.admission_tickets for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = admission_tickets.order_id
        and e.organizer_id = auth.uid ()
    )
  );

drop policy if exists "admission_tickets_select_super" on public.admission_tickets;
create policy "admission_tickets_select_super"
  on public.admission_tickets for select to authenticated
  using (public.is_super_admin ());

-- ---------------------------------------------------------------------------
-- Issue tickets (assigns seats + inserts rows; idempotent if already issued)
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

  if rec.status is distinct from 'paid' then
    raise exception 'Order must be paid before tickets can be issued.';
  end if;

  if exists (
    select 1 from public.admission_tickets t where t.order_id = p_order_id limit 1
  ) then
    return;
  end if;

  with
    picked as (
      select s.id
      from public.seats s
      where s.ticket_type_id = rec.ticket_type_id
        and s.event_id = rec.event_id
        and s.status = 'available'
      order by s.created_at
      limit rec.quantity
      for update
    ),
    assigned as (
      update public.seats s
      set status = 'assigned'
      from picked p
      where s.id = p.id
      returning s.id
    )
  insert into public.admission_tickets (order_id, seat_id)
  select p_order_id, a.id from assigned a;

  get diagnostics inserted = row_count;

  if coalesce (inserted, 0) is distinct from rec.quantity then
    raise exception 'Could not assign seats for this order (inventory may be insufficient).';
  end if;
end;
$$;

grant execute on function public.issue_admission_tickets_for_order (uuid) to authenticated;
