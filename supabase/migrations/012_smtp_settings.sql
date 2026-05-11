-- Super Admin: SMTP settings (password stored encrypted by app using SMTP_SETTINGS_ENCRYPTION_KEY).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.smtp_settings (
  id uuid primary key default gen_random_uuid (),
  host text not null,
  port int not null check (port > 0 and port <= 65535),
  username text not null,
  encrypted_password text not null,
  from_email text not null,
  from_name text not null default 'Eventuz',
  encryption_type text not null
    check (encryption_type in ('tls', 'ssl', 'none')),
  is_active boolean not null default true,
  last_tested_at timestamptz,
  last_test_error text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create unique index if not exists smtp_settings_one_active_true
  on public.smtp_settings (is_active)
  where is_active = true;

drop trigger if exists set_smtp_settings_updated_at on public.smtp_settings;
create trigger set_smtp_settings_updated_at
  before update on public.smtp_settings
  for each row execute procedure public.set_updated_at ();

alter table public.smtp_settings enable row level security;

drop policy if exists "smtp_settings_select_super" on public.smtp_settings;
create policy "smtp_settings_select_super"
  on public.smtp_settings for select to authenticated
  using (public.is_super_admin ());

drop policy if exists "smtp_settings_insert_super" on public.smtp_settings;
create policy "smtp_settings_insert_super"
  on public.smtp_settings for insert to authenticated
  with check (public.is_super_admin ());

drop policy if exists "smtp_settings_update_super" on public.smtp_settings;
create policy "smtp_settings_update_super"
  on public.smtp_settings for update to authenticated
  using (public.is_super_admin ())
  with check (public.is_super_admin ());

drop policy if exists "smtp_settings_delete_super" on public.smtp_settings;
create policy "smtp_settings_delete_super"
  on public.smtp_settings for delete to authenticated
  using (public.is_super_admin ());
