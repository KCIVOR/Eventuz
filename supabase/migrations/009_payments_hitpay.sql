-- HitPay payments (Phase 8 checkout — webhook confirmation is a later step)

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'hitpay'
    check (provider = 'hitpay'),
  provider_payment_id text,
  provider_checkout_id text not null,
  provider_checkout_url text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null,
  status text not null
    check (status in ('pending', 'succeeded', 'failed', 'expired')),
  webhook_received_at timestamptz,
  raw_webhook_payload jsonb,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_provider_checkout_id_idx on public.payments (provider_checkout_id);

-- At most one in-flight HitPay session per order (new attempt after terminal states)
create unique index if not exists payments_one_pending_per_order
  on public.payments (order_id)
  where status = 'pending';

drop trigger if exists set_payments_updated_at on public.payments;

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute procedure public.set_updated_at ();

alter table public.payments enable row level security;

drop policy if exists "payments_select_buyer" on public.payments;

create policy "payments_select_buyer"
  on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.buyer_user_id = auth.uid ()
    )
  );

drop policy if exists "payments_insert_buyer" on public.payments;

create policy "payments_insert_buyer"
  on public.payments for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.buyer_user_id = auth.uid ()
    )
  );

drop policy if exists "payments_update_buyer" on public.payments;

create policy "payments_update_buyer"
  on public.payments for update to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.buyer_user_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.buyer_user_id = auth.uid ()
    )
  );

drop policy if exists "payments_select_super_admin" on public.payments;

create policy "payments_select_super_admin"
  on public.payments for select to authenticated
  using (public.is_super_admin ());
