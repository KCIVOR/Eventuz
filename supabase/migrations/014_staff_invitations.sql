-- Staff invitations (scanner) per event; acceptance links use SHA-256 hashed tokens.

-- ---------------------------------------------------------------------------
-- staff_invitations
-- ---------------------------------------------------------------------------
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid (),
  event_id uuid not null references public.events (id) on delete cascade,
  organizer_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  status text not null
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invite_token_hash text not null,
  expires_at timestamptz not null,
  accepted_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists staff_invitations_event_id_idx on public.staff_invitations (event_id);
create index if not exists staff_invitations_pending_token_idx
  on public.staff_invitations (invite_token_hash)
  where status = 'pending';

create unique index if not exists staff_invitations_one_pending_per_email_event
  on public.staff_invitations (event_id, lower(trim(email)))
  where status = 'pending';

drop trigger if exists set_staff_invitations_updated_at on public.staff_invitations;
create trigger set_staff_invitations_updated_at
  before update on public.staff_invitations
  for each row execute procedure public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- event_staff
-- ---------------------------------------------------------------------------
create table if not exists public.event_staff (
  id uuid primary key default gen_random_uuid (),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null
    check (role in ('scanner')),
  status text not null
    check (status in ('active', 'revoked')),
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  unique (event_id, user_id)
);

create index if not exists event_staff_user_id_idx on public.event_staff (user_id);
create index if not exists event_staff_event_id_idx on public.event_staff (event_id);

drop trigger if exists set_event_staff_updated_at on public.event_staff;
create trigger set_event_staff_updated_at
  before update on public.event_staff
  for each row execute procedure public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- RLS: staff_invitations
-- ---------------------------------------------------------------------------
alter table public.staff_invitations enable row level security;

drop policy if exists "staff_invitations_select_organizer_event" on public.staff_invitations;
create policy "staff_invitations_select_organizer_event"
  on public.staff_invitations for select to authenticated
  using (
    organizer_id = auth.uid ()
    or public.is_super_admin ()
  );

drop policy if exists "staff_invitations_insert_organizer_event" on public.staff_invitations;
create policy "staff_invitations_insert_organizer_event"
  on public.staff_invitations for insert to authenticated
  with check (
    organizer_id = auth.uid ()
    and exists (
      select 1 from public.events e
      where e.id = staff_invitations.event_id
        and e.organizer_id = auth.uid ()
    )
  );

drop policy if exists "staff_invitations_update_organizer_event" on public.staff_invitations;
create policy "staff_invitations_update_organizer_event"
  on public.staff_invitations for update to authenticated
  using (organizer_id = auth.uid ())
  with check (organizer_id = auth.uid ());

-- ---------------------------------------------------------------------------
-- RLS: event_staff
-- ---------------------------------------------------------------------------
alter table public.event_staff enable row level security;

drop policy if exists "event_staff_select_self_or_organizer" on public.event_staff;
create policy "event_staff_select_self_or_organizer"
  on public.event_staff for select to authenticated
  using (
    user_id = auth.uid ()
    or exists (
      select 1 from public.events e
      where e.id = event_staff.event_id
        and e.organizer_id = auth.uid ()
    )
    or public.is_super_admin ()
  );

drop policy if exists "event_staff_update_organizer" on public.event_staff;
create policy "event_staff_update_organizer"
  on public.event_staff for update to authenticated
  using  (
    exists (
      select 1 from public.events e
      where e.id = event_staff.event_id
        and e.organizer_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_staff.event_id
        and e.organizer_id = auth.uid ()
    )
  );

-- Inserts only via accept_staff_invitation (security definer).

-- ---------------------------------------------------------------------------
-- Accept invite: verify token, email match, promote attendee → staff, upsert event_staff
-- ---------------------------------------------------------------------------
create or replace function public.accept_staff_invitation (p_raw_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid ();
  v_email text;
  v_hash text;
  inv public.staff_invitations%rowtype;
  r_role text;
begin
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  if p_raw_token is null or trim(p_raw_token) = '' then
    raise exception 'Invalid invitation link.';
  end if;

  select email into strict v_email from auth.users where id = v_uid;

  v_hash := encode (
    extensions.digest (convert_to (trim(p_raw_token), 'UTF8'), 'sha256'),
    'hex'
  );

  select * into strict inv
  from public.staff_invitations
  where invite_token_hash = v_hash
    and status = 'pending'
    and expires_at > now ();

  if lower(trim(inv.email)) is distinct from lower(trim(v_email)) then
    raise exception 'Sign in with the email this invitation was sent to, or create an account using that email.';
  end if;

  select role into strict r_role from public.profiles where id = v_uid;

  if r_role in ('organizer', 'super_admin') then
    raise exception 'This account type cannot accept a staff scanner invitation.';
  end if;

  insert into public.event_staff (event_id, user_id, role, status)
  values (inv.event_id, v_uid, 'scanner', 'active')
  on conflict (event_id, user_id) do update
  set role = excluded.role,
    status = 'active',
    updated_at = now ();

  update public.staff_invitations
  set status = 'accepted', accepted_user_id = v_uid, updated_at = now ()
  where id = inv.id;

  update public.profiles
  set role = 'staff', updated_at = now ()
  where id = v_uid and role = 'attendee';
end;
$$;

grant execute on function public.accept_staff_invitation (text) to authenticated;
