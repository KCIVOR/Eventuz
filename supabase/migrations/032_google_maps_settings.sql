-- Super Admin: Google Maps browser key settings.
-- The key is encrypted by the app, then exposed only when rendering map UI.

create table if not exists public.google_maps_settings (
  id uuid primary key default gen_random_uuid(),
  encrypted_api_key text not null,
  is_active boolean not null default true,
  last_tested_at timestamptz,
  last_test_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists google_maps_settings_one_active_true
  on public.google_maps_settings (is_active)
  where is_active = true;

drop trigger if exists set_google_maps_settings_updated_at on public.google_maps_settings;
create trigger set_google_maps_settings_updated_at
  before update on public.google_maps_settings
  for each row execute procedure public.set_updated_at();

alter table public.google_maps_settings enable row level security;

drop policy if exists "google_maps_settings_select_super" on public.google_maps_settings;
create policy "google_maps_settings_select_super"
  on public.google_maps_settings for select to authenticated
  using (public.is_super_admin());

drop policy if exists "google_maps_settings_insert_super" on public.google_maps_settings;
create policy "google_maps_settings_insert_super"
  on public.google_maps_settings for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "google_maps_settings_update_super" on public.google_maps_settings;
create policy "google_maps_settings_update_super"
  on public.google_maps_settings for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "google_maps_settings_delete_super" on public.google_maps_settings;
create policy "google_maps_settings_delete_super"
  on public.google_maps_settings for delete to authenticated
  using (public.is_super_admin());
