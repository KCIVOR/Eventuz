-- Phase 7: expire unpaid holds globally + reprice expired early-bird locks
--
-- Run after 007_phase7_orders_inventory.sql
--
-- Scheduled jobs (recommended in production; not the only mechanism):
--   Supabase Dashboard → Database → Extensions → enable pg_cron (if available), then:
--   select cron.schedule('expire-stale-orders', '*/5 * * * *', $$ select public.expire_stale_unpaid_orders(); $$);
--   Or invoke the same SELECT from an Edge Function on a schedule.
-- The app also calls this RPC when loading the attendee event page and before creating holds.

-- ---------------------------------------------------------------------------
-- Global cleanup: status transitions only (no deletes)
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_unpaid_orders ()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Capacity hold ended — unpaid order no longer reserves quantity
  update public.orders o
  set
    status = 'expired',
    updated_at = now()
  where o.status = 'capacity_held'
    and o.capacity_hold_expires_at < now ();

  -- Payment window ended without confirmation
  update public.orders o
  set
    status = 'expired',
    updated_at = now()
  where o.status = 'payment_pending'
    and o.payment_expires_at < now ();

  -- Early-bird price lock ended while the overall hold/payment window is still open:
  -- switch to regular price so discounted rate is not kept indefinitely
  update public.orders o
  set
    unit_price_locked = tt.regular_price,
    total_amount = round((tt.regular_price * o.quantity::numeric), 2),
    pricing_type = 'regular',
    early_bird_price_expires_at = null,
    updated_at = now()
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

-- Anyone hitting the public attendee flow can trigger housekeeping (idempotent).
grant execute on function public.expire_stale_unpaid_orders () to anon;

grant execute on function public.expire_stale_unpaid_orders () to authenticated;

grant execute on function public.expire_stale_unpaid_orders () to service_role;
