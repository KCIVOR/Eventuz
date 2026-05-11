-- PostgREST can return 500 on GET /profiles when RLS policies reference
-- is_super_admin() / is_organizer(), which query public.profiles. Without
-- disabling row_security inside those SECURITY DEFINER helpers, PostgreSQL
-- re-applies profiles RLS and may error: infinite recursion detected in policy
-- for relation "profiles".

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;

create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'organizer'
  );
$$;
