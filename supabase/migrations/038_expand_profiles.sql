-- Expand profiles table to include more user data
alter table public.profiles 
add column if not exists organization_name text,
add column if not exists address text,
add column if not exists birthday date,
add column if not exists phone_number text,
add column if not exists bio text;
