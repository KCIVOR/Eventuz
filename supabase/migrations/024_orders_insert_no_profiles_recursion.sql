-- Break RLS cycle causing 42P17 on INSERT orders (Hold quantity):
-- orders_insert_own checked profiles via EXISTS; profiles permissive policies
-- include profiles_select_buyer_for_organizer_event_orders, which reads orders;
-- orders RLS re-enters and Postgres reports infinite recursion on relation "orders".

create or replace function public.auth_session_role_is_attendee ()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'attendee'
  );
$$;

grant execute on function public.auth_session_role_is_attendee () to authenticated;

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert to authenticated
  with check (
    buyer_user_id = auth.uid()
    and public.auth_session_role_is_attendee ()
  );
