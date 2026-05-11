-- Eventuz: profile email + status (active | disabled) for auth/RBAC
-- Run in Supabase SQL Editor after 001_phase1_schema.sql

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists status text not null default 'active'
    check (status in ('active', 'disabled'));

create index if not exists profiles_status_idx on public.profiles (status);

-- Backfill email from auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

-- ---------------------------------------------------------------------------
-- New user: include email + status
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'attendee',
    new.email,
    'active'
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep profile email in sync when auth email changes
-- ---------------------------------------------------------------------------
create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email_from_auth ();
