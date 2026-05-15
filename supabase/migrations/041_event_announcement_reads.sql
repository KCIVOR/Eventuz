-- 041_event_announcement_reads.sql
-- Track whether a user has read an announcement.

create table if not exists public.event_announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.event_announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

create index if not exists event_announcement_reads_announcement_id_idx on public.event_announcement_reads (announcement_id);
create index if not exists event_announcement_reads_user_id_idx on public.event_announcement_reads (user_id);

-- Enable RLS
alter table public.event_announcement_reads enable row level security;

-- SELECT: Only own read records
drop policy if exists "announcement_reads_select" on public.event_announcement_reads;
create policy "announcement_reads_select"
  on public.event_announcement_reads for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT: Only own read records
drop policy if exists "announcement_reads_insert" on public.event_announcement_reads;
create policy "announcement_reads_insert"
  on public.event_announcement_reads for insert
  to authenticated
  with check (user_id = auth.uid());

-- DELETE: Only own read records
drop policy if exists "announcement_reads_delete" on public.event_announcement_reads;
create policy "announcement_reads_delete"
  on public.event_announcement_reads for delete
  to authenticated
  using (user_id = auth.uid());
