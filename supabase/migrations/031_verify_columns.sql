-- Force verify and add columns if missing (in case of schema cache or partial migration issues)
alter table public.events
  add column if not exists formatted_address text,
  add column if not exists lat numeric,
  add column if not exists lng numeric;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
