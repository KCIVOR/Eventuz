-- Super Admin: HitPay settings (API Key and Salt stored encrypted by app).
-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.hitpay_settings (
  id uuid not null default gen_random_uuid(),
  encrypted_api_key text,
  encrypted_salt text,
  is_sandbox boolean not null default true,
  currency text not null default 'PHP'::text,
  is_active boolean not null default true,
  allow_simulation boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id)
);

-- ---------------------------------------------------------------------------
-- Security (RLS)
-- ---------------------------------------------------------------------------
alter table public.hitpay_settings enable row level security;

-- Policy: Only super admins can manage settings
create policy "Super admins can manage hitpay settings"
  on public.hitpay_settings
  as permissive
  for all
  to public
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );
