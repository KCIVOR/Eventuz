-- Super Admin: platform Terms and Conditions settings + signup acceptance tracking.

create table if not exists public.platform_terms_settings (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  version int not null default 1 check (version >= 1),
  is_active boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_terms_settings_one_active_true
  on public.platform_terms_settings (is_active)
  where is_active = true;

drop trigger if exists set_platform_terms_settings_updated_at on public.platform_terms_settings;
create trigger set_platform_terms_settings_updated_at
  before update on public.platform_terms_settings
  for each row execute procedure public.set_updated_at();

create table if not exists public.profile_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  terms_id uuid not null references public.platform_terms_settings (id) on delete restrict,
  terms_version int not null check (terms_version >= 1),
  accepted_at timestamptz not null default now()
);

create unique index if not exists profile_terms_acceptances_profile_terms_unique
  on public.profile_terms_acceptances (profile_id, terms_id);

create index if not exists profile_terms_acceptances_profile_idx
  on public.profile_terms_acceptances (profile_id);

alter table public.platform_terms_settings enable row level security;
alter table public.profile_terms_acceptances enable row level security;

drop policy if exists "platform_terms_settings_select_super" on public.platform_terms_settings;
create policy "platform_terms_settings_select_super"
  on public.platform_terms_settings for select to authenticated
  using (public.is_super_admin());

drop policy if exists "platform_terms_settings_insert_super" on public.platform_terms_settings;
create policy "platform_terms_settings_insert_super"
  on public.platform_terms_settings for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "platform_terms_settings_update_super" on public.platform_terms_settings;
create policy "platform_terms_settings_update_super"
  on public.platform_terms_settings for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "platform_terms_settings_delete_super" on public.platform_terms_settings;
create policy "platform_terms_settings_delete_super"
  on public.platform_terms_settings for delete to authenticated
  using (public.is_super_admin());

drop policy if exists "profile_terms_acceptances_select_own_or_super" on public.profile_terms_acceptances;
create policy "profile_terms_acceptances_select_own_or_super"
  on public.profile_terms_acceptances for select to authenticated
  using (profile_id = auth.uid() or public.is_super_admin());

drop policy if exists "profile_terms_acceptances_insert_super" on public.profile_terms_acceptances;
create policy "profile_terms_acceptances_insert_super"
  on public.profile_terms_acceptances for insert to authenticated
  with check (public.is_super_admin());

create or replace function public.get_active_platform_terms()
returns table (
  id uuid,
  content text,
  version int,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select pts.id, pts.content, pts.version, pts.updated_at
  from public.platform_terms_settings pts
  where pts.is_active = true
    and length(trim(pts.content)) > 0
  order by pts.updated_at desc
  limit 1;
$$;

grant execute on function public.get_active_platform_terms() to anon, authenticated;
